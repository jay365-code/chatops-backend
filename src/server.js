const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
const openai = require("openai");

// import OpenAI from "openai";
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

const chatParser = require("./parser.js");
const chatFlow = require("./chatbot-flow.js");
const session = require("express-session");
// const secretKey = process.env.SESSION_SECRET || 'myverylongrandomsecretkey';
const secretKey = process.env.SESSION_SECRET || "LSJLK-SLD83-DLFJG-28375-JHLEE";
console.log("secretKey=" + secretKey);

const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: ["http://localhost:8080", "http://172.16.10.168:3001/"], // 허용할 origin (프론트엔드 앱의 주소)
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
    console.log("A: " + aiResponse);
    res.json({ output: aiResponse });
  } catch (error) {
    console.error("Error getting AI response:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

app.listen(5050, () => {
  console.log("Server is running on port 5050");
  console.log(process.env.OPENAI_API_KEY);
});
