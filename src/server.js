const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");
// import { pipeline } from "node:stream/promises";

// import OpenAI from "openai";
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

const chatParser = require("./parser.js");
const chatFlow = require("./chatbot-flow.js");
const prompts = require("./prompts.js");
const session = require("express-session");
// const secretKey = process.env.SESSION_SECRET || 'myverylongrandomsecretkey';
const secretKey = process.env.SESSION_SECRET || "LSJLK-SLD83-DLFJG-28375-JHLEE";
console.log("secretKey=" + secretKey);

const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://172.16.10.168:3001/",
      "http://172.16.10.168:3004/",
    ], // 허용할 origin (프론트엔드 앱의 주소)
    credentials: true, // credentials 모드 사용
  })
);

app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
  })
);

const API_URL =
  "https://www.stack-inference.com/run_deployed_flow?flow_id=64ab8f4d036adfef3faee13f&org=0b713554-21ff-409a-b843-985bfc350d9c";
const headers = {
  Authorization: "Bearer public_key",
  "Content-Type": "application/json",
};

const openaiHeaders = {
  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  "Content-Type": "application/json",
};

//  Stack AI API를 활용한 코드, 추후 사용하지 않을 예정
app.post("/query", (req, res) => {
  // 세션에서 입력 정보를 가져와 Context 완성
  if (req.session.output === undefined) {
    req.session.output = new chatParser.Output("", 0, "");
    console.log("request session.output: 초기화");
  } else {
    console.log(
      "request session.output: " + JSON.stringify(req.session.output)
    );
  }

  const context = `Context:\n-----------\n클라우드 사업자: ${
    req.session.output.provider || "미입력"
  }\n노드 수량: ${req.session.output.numNodes || "미입력"}\n지역: ${
    req.session.output.location || "미입력"
  }\n-----------\n`;
  req.body["in-0"] = context + JSON.stringify(req.body);
  console.log("req.body: " + JSON.stringify(req.body));

  axios
    .post(API_URL, req.body, { headers: headers })
    .then((response) => {
      //   res.json({ output: response.data.outputs[0].result });
      console.log("out-0: " + response.data["out-0"]);
      const { regularText, output } = chatParser.parseText(
        response.data["out-0"]
      );
      // console.log("aiResponse: " + regularText + ", provider: " + output.provider);
      if (output !== null) {
        req.session.output = JSON.parse(JSON.stringify(output)); // 세션에 입력 정보 저장
        console.log(
          "response session.output: " + JSON.stringify(req.session.output)
        );
        res.json({ output: regularText });
      } else {
        res.json({ output: process.env.EXCPTION_NULL_ANSWWER });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send(error);
    });
});

app.post("/chat", async (req, res) => {
  try {
    const aiResponse = await chatFlow.chattingFlow(req); // 'await'를 사용해 chattingFlow에서 반환되는 값을 기다립니다.
    console.log("<===A: " + aiResponse);
    res.json({ output: aiResponse });
  } catch (error) {
    console.error("Error getting AI response:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

app.get("/chat-stream", (req, res) => {
  const openai = new OpenAI();
  let aiResponse = "";
  let systemContent = null;
  const currentState = req.session.currentState;
  console.log("req.session.currentState=" + req.session.currentState);
  if (currentState === undefined) {
    chatFlow.init(req);
  }

  // const userContent = req.body["in-0"];
  const userContent = `${req.query["in-0"]}`;
  console.log("in-0: " + userContent);
  // TBD: -add Chat History, Stream 방식의 답변에서 응답 완성 루틴 필요
  //      -CMP 스웨거 or Open API spec 3.0 베이스로 JSON 생성하게 만들자
  // 사용자 입력이 비어있는 경우 처리
  if (!userContent || userContent.trim() === "") {
    res.send("죄송합니다. 다시 입력해 주세요.");
    return; // 함수 실행 종료
  }

  systemContent = `${prompts.SYSTEM_PROMPT_CHAT_INSTANCE_NEW}`;
  const chatHistoryText = chatFlow.getChatHistory(req, 1);
  systemContent += `\nChat History: ${chatHistoryText}`;
  console.log("systemContent=" + systemContent);

  // let's assume here req.body
  (async function openAiApi() {
    const stream = await openai.chat.completions.create(
      {
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
        temperature: 0.5,
        max_tokens: 4096,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: true,
      },
      { headers: openaiHeaders }
    );

    // 스트림 응답을 위한 Content-Type 설정
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080");

    for await (const chunk of stream) {
      const content = chunk.choices[0].delta.content;
      if (content) {
        // content가 유효한지 확인
        // const formattedData = `data: ${JSON.stringify(content)}\n\n`;
        const formattedData = `data: ${content
          .replace(/ /g, "&nbsp;")
          .replace(/\n/g, "<br>")}\r\n\r\n`;
        // const convertedData = formattedData.replace(/\n/g, "\r\n");
        res.write(formattedData + "\r\n");
        console.log(formattedData);
        aiResponse += content;
        // res.write(content);
      }
    }
    chatFlow.setChatHistory(req, userContent, aiResponse);
    res.end();
    // console.log("aiResponse=" + aiResponse);
  })();
});

app.post("/chatapi-stream", async (req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      // We need to send the body as a string, so we use JSON.stringify.
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            // The message will be 'Say hello.' unless you provide a message in the request body.
            content: ` ${req.body.message || "Say hello."}`,
          },
        ],
        temperature: 0,
        max_tokens: 25,
        n: 1,
        stream: true,
      }),
    });

    await pipeline(response.body, res);
  } catch (err) {
    console.log(err);
  }
});

app.listen(5050, () => {
  console.log("Server is running on port 5050");
  console.log(process.env.OPENAI_API_KEY);
});
