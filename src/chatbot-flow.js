const axios = require("axios");

const chatParser = require("./parser.js");
const { text } = require("express");
const {
  getRecommendedCPU,
  getRecommendedStorage,
  getRecommendedInstance,
  createInstance,
} = require("./cmp-if.js");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const openaiHeaders = {
  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  "Content-Type": "application/json",
};

async function chattingFlow(req) {
  const currentState = req.session.currentState;
  let context = null;
  let systemContent = null,
    userContent = null;
  let aiResponse;

  // req.session instance 정보 조회(for DEGUG)
  console.log("req.session.instance=" + JSON.stringify(req.session.instance));
  // console.log("req.session.instanceCoreList=" + req.session.instanceCoreList);
  // console.log(
  //   "req.session.instanceStorageList=" + req.session.instanceStorageList
  // );
  // console.log("req.session.instanceOsList=" + req.session.instanceOsList);
  // console.log(
  //   "req.session.instanceMemoryList=" + req.session.instanceMemoryList
  // );

  if (currentState === "instance") {
    console.log("currentState is instance");
    // console.log("req.session.instance=" + JSON.stringify(req.session.instance));
    context = chatParser.makeInstanceContext(req); // 기 입력 정보를 기반으로 context 작성
    systemContent = `${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE} ###${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE2} ${context} ${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE3}[${req.session.instanceCoreList}]. ${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE6}[${req.session.instanceStorageList}].`;

    // memeory, OS list 추가
    if (req.session.instance.numCPU) {
      systemContent += `${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE4} [${req.session.instanceOsList}].`;
      systemContent += ` ${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE5} [${req.session.instanceMemoryList}].`;
    }

    // Chat hisotory 추가, 최신 대화 1개만..., 최대 10개까지 가능
    const chatHistoryText = getChatHistory(req, 1);
    systemContent += ` Chat History: ${chatHistoryText}`;
  } else if (currentState === "cluster") {
    console.log("currentState is cluster");
    context = chatParser.makeInstanceContext(req); // 기 입력 정보를 기반으로 context 작성
    systemContent = `${process.env.OPENAI_CHAT_SYSTEM_PROMPT_CLUSTER} ###${process.env.OPENAI_CHAT_SYSTEM_PROMPT_CLUSTER2} ${context} ${process.env.OPENAI_CHAT_SYSTEM_PROMPT_CLUSTER3}[${req.session.instanceCoreList}]. ${process.env.OPENAI_CHAT_SYSTEM_PROMPT_CLUSTER6}[${req.session.instanceStorageList}].`;

    // memeory, OS list 추가
    if (req.session.instance.numCPU) {
      systemContent += `${process.env.OPENAI_CHAT_SYSTEM_PROMPT_CLUSTER4} [${req.session.instanceOsList}].`;
      systemContent += ` ${process.env.OPENAI_CHAT_SYSTEM_PROMPT_CLUSTER5} [${req.session.instanceMemoryList}].`;
    }

    // Chat hisotory 추가, 최신 대화 1개만..., 최대 10개까지 가능
    const chatHistoryText = getChatHistory(req, 1);
    systemContent += ` Chat History: ${chatHistoryText}`;
  } else if (currentState === "start") {
    console.log("currentState=" + currentState);
    context = chatParser.makeInstanceContext(req); // 기 입력 정보를 기반으로 context 작성
    systemContent = `${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INTEGRATION}###${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INTEGRATION2} ${context} ${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE3}[${req.session.instanceCoreList}]. ${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE6}[${req.session.instanceStorageList}].`;
    // memeory, OS list 추가
    if (req.session.instance.numCPU) {
      systemContent += `${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE4} [${req.session.instanceOsList}].`;
      systemContent += ` ${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INSTANCE5} [${req.session.instanceMemoryList}]`;
    }
    console.log(
      "OPENAI_CHAT_SYSTEM_PROMPT_INTEGRATION=" +
        process.env.OPENAI_CHAT_SYSTEM_PROMPT_INTEGRATION
    );
    // Chat hisotory 추가, 최신 대화 1개만..., 최대 10개까지 가능
    const chatHistoryText = getChatHistory(req, 1);
    systemContent += ` Chat History: ${chatHistoryText}`;
  } else if (currentState === undefined) {
    init(req); // 세션에서 필수 입력 정보 초기화, 현재는 instance만, 추후 cluster 추가 필요!
    systemContent = `${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INTEGRATION}###${process.env.OPENAI_CHAT_SYSTEM_PROMPT_INTEGRATION2}`;
  } else {
    console.log(
      "check session... currentState=" + JSON.stringify(currentState)
    );
    return "답변할 수 없습니다. 다시 시도해 주세요.";
  }

  userContent = req.body["in-0"];
  console.log(systemContent);
  console.log("Q: " + userContent);
  console.log("currentState=" + req.session.currentState);
  console.log("intent=" + req.session.intent);

  aiResponse = await aiTask(req, systemContent, userContent);
  // console.log("aiResponse=" + aiResponse);

  const intent = req.session.intent;
  console.log("intent=" + intent);
  switch (intent) {
    case "end":
      sayGoodbye(req);
      break;
    // case "re-enter":
    case "reset":
      initInputs(req);
      break;
    case "create instance":
      const result = await createInstance(req);
      console.log("추천된 인스턴스를 생성합니다. result=" + result.returnCode);

      if (result.returnCode === "10001") {
        aiResponse = `인스턴스 생성을 완료했습니다. 생성된 VM은 ${result.vmName} 입니다.`;
      } else if (result.returnCode === "inputting") {
      } else {
        aiResponse = "인스턴 생성을 실패했습니다. 입력값을 다시 확인해 보세요.";
      }
      break;
    case "create cluster": // TBD: cluster 생성 로직 추가
      console.log("클러스터를 생성합니다.");
      break;
    case "input complete":
      getRecommendedInstance(req);
      break;
    case "verify recommendation": // 추천 instance 보여주고, 진행 여부 확인
      if (req.session.recommendedInstance) {
        systemContent = `${process.env.OPENAI_CHAT_SYSTEM_PROMPT_VI} ###${
          process.env.OPENAI_CHAT_SYSTEM_PROMPT_VI2
        } Context: ${JSON.stringify(req.session.recommendedInstance)}`;
      } else {
        // req.session.recommendedInstance === undefined
        systemContent = `${process.env.OPENAI_CHAT_SYSTEM_PROMPT_VI} ###${process.env.OPENAI_CHAT_SYSTEM_PROMPT_VI2} Context: 추천 인스턴스 없음.`;
      }
      userContent = process.env.OPENAI_CHST_USER_PROMPT_VI;
      console.log(systemContent);
      console.log("Q: " + userContent);
      console.log("currentState=" + req.session.currentState);
      console.log("intent=" + req.session.intent);

      aiResponse = await aiTask(req, systemContent, userContent);
      // if (req.session.intent == "create instance") {
      //   console.log("추천된 인스턴스를 생성합니다.");
      // }
      break;
    case "update":
      break;
    default:
      console.log("unknown intent=" + intent);
  }

  setChatHistory(req, userContent, aiResponse);
  return aiResponse;
}

async function aiTask(req, systemContent, userContent) {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.5,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      },
      { headers: openaiHeaders }
    );

    const aiResponse = response.data.choices[0].message.content;
    console.log("aiResponse=" + JSON.stringify(aiResponse));
    const { regularText, output, workIntention, intent } = chatParser.parseText(
      req,
      aiResponse
    );

    if (workIntention == "instance" || workIntention == "cluster") {
      req.session.currentState = workIntention;
      console.log("currentState=" + req.session.currentState);
    } else {
      console.log("unknown workIntent=" + workIntention);
    }

    // instance, cluster에 따른 필수 입력 처리, cluster 처리는 어떻게 할지 고려하자.
    // numCPU 변경 시: 메모리, OS템플릿, 추천 인스턴스 초기화해서 다시 입력받도록 한다.
    if (output !== null) {
      output.numCPU !== null
        ? (req.session.instance.numCPU = output.numCPU)
        : null;
      output.sizeMemory !== null
        ? (req.session.instance.sizeMemory = output.sizeMemory)
        : null;
      output.osTemplate !== null
        ? (req.session.instance.osTemplate = output.osTemplate)
        : null;
      output.sizeStorage !== null
        ? (req.session.instance.sizeStorage = output.sizeStorage)
        : null;
      output.numNode !== null
        ? (req.session.instance.numNode = output.numNode)
        : null;

      req.session.save((err) => {});
    }

    req.session.intent = intent;

    // console.log("regularText=" + regularText);
    return regularText;
  } catch (error) {
    console.error(error);
    return process.env.EXCPTION_NULL_ANSWWER;
  }
}

function init(req) {
  // Chat start.
  // req.session.instance = new chatParser.Instance();
  req.session.instance = {};
  req.session.instance.numCPU = null;
  req.session.instance.sizeMemory = null;
  req.session.instance.osTemplate = null;
  req.session.instance.sizeStorage = null;
  req.session.instance.numNode = null;
  req.session.currentState = "start";

  req.session.chatHistory = [];

  getRecommendedCPU(req);
  getRecommendedStorage(req);

  req.session.save((err) => {
    // console.log("req.session.instanceMemoryList was saved...");
  });

  console.log("[CHATOPS]: 대화 시작...");
}

function sayGoodbye(req) {
  console.log("대화를 종료합니다.");
  // delete req.session.currentState; // session 정보를 어떻게 정리할 지 추가 검토 필요. 일단 currentState만 삭제함.
  req.session.destroy((err) => {
    console.log("session was destroyed...");
  });

  return "대화를 종료합니다.";
}

function initInputs(req) {
  console.log("값을 초기화합니다.");
  req.session.instance.numCPU = null;
  req.session.instance.sizeMemory = null;
  req.session.instance.osTemplate = null;
  req.session.instance.sizeStorage = null;
  req.session.instance.numNode = null;

  // req.session.instanceCoreList = null;
  req.session.instanceMemoryList = null;
  req.session.instanceOsList = null;
  // req.session.instanceStorageList = null;

  req.session.save((err) => {
    // console.log("req.session.instanceMemoryList was saved...");
  });
}

function setChatHistory(req, question, answer) {
  // 대화 항목 추가
  req.session.chatHistory.push({ question: question, answer: answer });

  // chatHistory 배열의 길이를 확인하여 10개의 대화 항목만 유지
  if (req.session.chatHistory.length > 10) {
    req.session.chatHistory.splice(0, req.session.chatHistory.length - 10);
  }
}

function getChatHistory(req, count) {
  if (!req.session.chatHistory || req.session.chatHistory.length === 0) {
    return "대화 기록이 없습니다.";
  }

  // 대화 기록 배열에서 가장 최신 대화 개수(count)만큼 추출합니다.
  const recentChatHistory = req.session.chatHistory.slice(-count);

  // 대화 기록을 text 형식으로 변환합니다.
  const textHistory = recentChatHistory.map((conversation) => {
    const question = conversation.question;
    const answer = conversation.answer;
    return `Q: ${question} A: ${answer} `;
  });

  // 텍스트 형식의 대화 기록을 줄바꿈 문자로 연결하여 반환합니다.
  return textHistory.join("\n");
}

module.exports = {
  chattingFlow: chattingFlow,
};
