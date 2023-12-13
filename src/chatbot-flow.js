const axios = require("axios");

const chatParser = require("./parser.js");
const prompts = require("./prompts.js");
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

const OPENAI_API_COMPLETE_URL = "https://api.openai.com/v1/completions";

async function chattingFlow(req) {
  const currentState = req.session.currentState;
  let context = null;
  let systemContent = null,
    userContent = null;
  let aiResponse;

  // req.session instance 정보 조회(for DEGUG)
  console.log("req.session.instance=" + JSON.stringify(req.session.instance));
  console.log(
    "+++++req.session.recommendedInstanceStatus=" +
      req.session.recommendedInstanceStatus
  );
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
    // Chat, Extract 분리
    systemContent = `${prompts.SYSTEM_PROMPT_CHAT_INSTANCE} ${context}\n${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_CPU}[${req.session.instanceCoreList}]\n${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_STORAGE}[${req.session.instanceStorageList}]`;

    // memeory, OS list 추가
    if (req.session.instance.numCPU) {
      systemContent += `${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_OS} [${req.session.instanceOsList}]`;
      systemContent += `${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_MEM} [${req.session.instanceMemoryList}]\n`;
    }

    // 추천 인스턴스
    if (req.session.recommendedInstance) {
      systemContent += `\n추천 인스턴스: ${JSON.stringify(
        req.session.recommendedInstance
      )}\n`;
    } else {
      systemContent += `\n추천 인스턴스: 추천 인스턴스 없음. 입력이 완료되었다면 "추천 인스턴스 조회"라고 입력하세요.\n입력 완료 후에도 추천 인스턴스가 없는 경우는 스토리지 사이즈가 생성하려는 이미지보다 작은 경우에 발생할 수 있습니다.\n`;
    }
    systemContent += `\n추천 인스턴스 상태: ${req.session.recommendedInstanceStatus}\n`;

    // Chat hisotory 추가, 최신 대화 1개만..., 최대 10개까지 가능
    const chatHistoryText = getChatHistory(req, 1);
    systemContent += `\nChat History: ${chatHistoryText}`;
  } else if (currentState === "cluster") {
    console.log("currentState is cluster");
    context = chatParser.makeInstanceContext(req); // 기 입력 정보를 기반으로 context 작성
    systemContent = `${prompts.SYSTEM_PROMPT_CHAT_CLUSTER} ${context}
    ${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_CPU}[${req.session.instanceCoreList}]
    ${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_STORAGE}[${req.session.instanceStorageList}].`;

    // memeory, OS list 추가
    if (req.session.instance.numCPU) {
      systemContent += `${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_OS} [${req.session.instanceOsList}].`;
      systemContent += ` ${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_MEM} [${req.session.instanceMemoryList}].`;
    }

    // 추천 인스턴스
    if (req.session.recommendedInstance) {
      systemContent += `\n추천 인스턴스: ${JSON.stringify(
        req.session.recommendedInstance
      )}\n`;
    } else {
      systemContent += `\n추천 인스턴스: 추천 인스턴스 없음. 입력이 완료되었다면 "추천 인스턴스 조회"라고 입력하세요.\n`;
    }
    systemContent += `인스턴스 생성 상태: ${req.session.recommendedInstanceStatus}\n`;

    // Chat hisotory 추가, 최신 대화 1개만..., 최대 10개까지 가능
    const chatHistoryText = getChatHistory(req, 1);
    systemContent += `\nChat History: ${chatHistoryText}`;
  } else if (currentState === "start") {
    console.log("currentState=" + currentState);
    context = chatParser.makeInstanceContext(req); // 기 입력 정보를 기반으로 context 작성
    systemContent = `${prompts.SYSTEM_PROMPT_CHAT} ${context}
    ${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_CPU}[${req.session.instanceCoreList}]
    ${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_STORAGE}[${req.session.instanceStorageList}]`;

    // memeory, OS list 추가
    if (req.session.instance.numCPU) {
      systemContent += `${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_OS} [${req.session.instanceOsList}].`;
      systemContent += ` ${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_MEM} [${req.session.instanceMemoryList}]`;
    }
    // Chat hisotory 추가, 최신 대화 1개만..., 최대 10개까지 가능
    const chatHistoryText = getChatHistory(req, 1);
    systemContent += `\nChat History: ${chatHistoryText}`;
  } else if (currentState === undefined) {
    init(req); // 세션에서 필수 입력 정보 초기화, 현재는 instance만, 추후 cluster 추가 필요!
    systemContent = `${prompts.SYSTEM_PROMPT_CHAT}`;
  } else if (currentState === "instance architecture") {
    console.log("currentState is instance architecture");
    systemContent = `${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_NEW}`;

    // Chat hisotory 추가, 최신 대화 1개만..., 최대 10개까지 가능
    const chatHistoryText = getChatHistory(req, 1);
    systemContent += `\nChat History: ${chatHistoryText}`;
  } else {
    console.log(
      "check session... currentState=" + JSON.stringify(currentState)
    );
    return "답변할 수 없습니다. 다시 시도해 주세요.";
  }

  userContent = req.body["in-0"];
  console.log(systemContent);
  console.log("===> Q: " + userContent);
  console.log("currentState=" + req.session.currentState);

  // TMP: NEXT#1
  // aiTaskExtract(req, userContent); // 사용자의 입력에서 의도를 추출, execIntent() 실행
  aiResponse = await aiTaskChat(req, systemContent, userContent); // Chat 용

  setChatHistory(req, userContent, aiResponse);
  return aiResponse;
}

async function aiTaskChat(req, systemContent, userContent) {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        // model: "gpt-3.5-turbo",
        model: "gpt-4-1106-preview",
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
        // stream: true,
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

    // console.log("regularText=" + regularText);
    return aiResponse;
  } catch (error) {
    console.error(error);
    return process.env.EXCPTION_NULL_ANSWWER;
  }
}

function aiTaskExtract(req, userContent) {
  let systemContent = null;
  let assistantContent = null;
  let context = null;

  if (req.session.currentState === "instance") {
    context = chatParser.makeInstanceContext(req);
  } else if (req.session.currentState === "cluster") {
    context = chatParser.makeInstanceContext(req);
  }
  systemContent = `${prompts.SYSTEM_PROMPT_EXTRACT_INSTANCE} ${context}`;
  assistantContent = `${prompts.ASSISTANT_PROMPT_EXTRACT}`;
  const chatHistoryText = getChatHistory(req, 1);
  systemContent += `\nChat History: ${chatHistoryText}`;

  console.log("Extract system prompt=" + systemContent);

  // const prompt = `${systemContent} Input:${userContent}\n\n`;

  axios
    .post(
      OPENAI_API_URL,
      {
        // model: "gpt-3.5-turbo-instruct",
        model: "gpt-4-1106-preview",
        // prompt: prompt,
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "assistant",
            content: assistantContent,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_format: { type: "json_object" },
      },
      { headers: openaiHeaders }
    )
    .then((response) => {
      const aiResponse = response.data.choices[0].message.content;
      // console.log("*****Intent JSON=" + JSON.stringify(aiResponse));
      const { output, workIntention, intent } = chatParser.parseTextIntent(
        req,
        aiResponse
      );

      if (workIntention == "instance" || workIntention == "cluster") {
        req.session.currentState = workIntention;
      } else {
        console.log("unknown workIntent=" + workIntention);
      }
      // console.log("=========>currentState=" + req.session.currentState);

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
      }

      req.session.intent = intent;
      req.session.save((err) => {});

      execIntent(req);
    })
    .catch((error) => {
      console.error(error);
    });
}

async function aiTask(req, systemContent, userContent) {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-3.5-turbo",
        // model: "gpt-4",
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
  // TMP: NEXT#1
  // req.session.currentState = "start";
  req.session.currentState = "instance architecture";

  req.session.chatHistory = [];

  req.session.recommendedInstanceStatus = "필수 정보 수집 중";

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
  // req.session.destroy((err) => {
  //   console.log("session was destroyed...");
  // });
  initInputs(req);

  return;
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

  req.session.recommendedInstance = null;
  req.session.recommendedInstanceStatus = "필수 정보 수집 중";

  getRecommendedCPU(req);
  getRecommendedStorage(req);

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

function execIntent(req) {
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
      // const result = await createInstance(req);
      createInstance(req);
      console.log("========>추천된 인스턴스를 생성합니다.");

      // if (result.returnCode === "10001") {
      //   aiResponse = `인스턴스 생성을 완료했습니다. 생성된 VM은 ${result.vmName} 입니다.`;
      // } else if (result.returnCode === "inputting") {
      // } else {
      //   aiResponse = "인스턴 생성을 실패했습니다. 입력값을 다시 확인해 보세요.";
      // }
      break;
    case "input complete":
    case "select recommended instance":
      getRecommendedInstance(req);
      break;
    case "verify recommended instance": // 추천 instance 보여주고, 진행 여부 확인
      // getRecommendedInstance(req);
      // if (req.session.recommendedInstance) {
      //   systemContent = `${
      //     prompts.SYSTEM_PROMPT_CREATE_RESOURCE
      //   } 추천 인스턴스: ${JSON.stringify(req.session.recommendedInstance)}`;
      // } else {
      //   // req.session.recommendedInstance === undefined
      //   systemContent = `${prompts.SYSTEM_PROMPT_CREATE_RESOURCE} 추천 인스턴스: 추천 인스턴스 없음. 입력이 완료되었다면 "추천 인스턴스 조회"라고 입력하세요.`;
      // }
      // userContent = prompts.SYSTEM_PROMPT_EXTRACT_INSTANCE;
      // console.log(systemContent);
      // console.log("Q: " + userContent);
      // console.log("currentState=" + req.session.currentState);
      // console.log("intent=" + req.session.intent);

      // aiResponse = await aiTask(req, systemContent, userContent); // Chat 용
      // // if (req.session.intent == "create instance") {
      // //   console.log("추천된 인스턴스를 생성합니다.");
      // // }
      break;
    case "select recommended cluster":
    case "verify recommended cluster":
    case "create cluster": // TBD: cluster 생성 로직 추가
      console.log("TBD 클러스터 작업: " + intent);
      break;
    case "update":
      break;
    default:
      console.log("unknown intent=" + intent);
  }
}

module.exports = {
  chattingFlow: chattingFlow,
  getChatHistory: getChatHistory,
  setChatHistory: setChatHistory,
  init: init,
};
