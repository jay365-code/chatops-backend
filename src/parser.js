const cmpApi = require("./cmp-if.js");

class Instance {
  constructor(numCPU, sizeMemory, osTemplate, sizeStorage, numNode) {
    this._numCPU = numCPU;
    this._sizeMemory = sizeMemory;
    this._osTemplate = osTemplate;
    this._sizeStorage = sizeStorage;
    this._numNode = numNode;
  }

  // Getter 메서드
  get numCPU() {
    return this._numCPU;
  }

  get sizeMemory() {
    return this._sizeMemory;
  }

  get osTemplate() {
    return this._osTemplate;
  }

  get sizeStorage() {
    return this._sizeStorage;
  }
  get numNode() {
    return this._numNode;
  }

  // Setter 메서드
  set numCPU(value) {
    this._numCPU = value;
  }

  set sizeMemory(value) {
    this._sizeMemory = value;
  }

  set osTemplate(value) {
    this._osTemplate = value;
  }

  set sizeStorage(value) {
    this._sizeStorage = value;
  }
  set numNode(value) {
    this._numNode = value;
  }
}

function makeInstanceContext(req) {
  const context = `Context:\n-----------\n코어 수량: ${
    req.session.instance.numCPU || "미입력"
  }\n메모리 크기: ${req.session.instance.sizeMemory || "미입력"}\nOS 템플릿: ${
    req.session.instance.osTemplate || "미입력"
  }\n스토리지 크기: ${
    req.session.instance.sizeStorage || "미입력"
  }\n노드 수량: ${req.session.instance.numNode || "미입력"}\n-----------\n`;

  // console.log("context=" + context);

  return context;
}

function makeClusterContext(req) {
  const context = `Context:\n-----------\n코어 수량: ${
    req.session.cluster.numCPU || "미입력"
  }\n메모리 크기: ${req.session.cluster.sizeMemory || "미입력"}\nOS 템플릿: ${
    req.session.cluster.osTemplate || "미입력"
  }\n스토리지 크기: ${
    req.session.cluster.sizeStorage || "미입력"
  }\s노드 수량: ${req.session.cluster.numNode || "미입력"}\n-----------\n`;

  // console.log("context=" + context);

  return context;
}

function parseText(req, text) {
  let numCPU = null;
  let sizeMemory = null;
  let osTemplate = null;
  let sizeStorage = null;
  let numNode = null;

  // Find the index where JSON object starts
  const startIndex = text.indexOf("###");

  // If '###' is not found, assign empty strings
  const regularText =
    startIndex !== -1 ? text.slice(0, startIndex).trim() : text;
  const jsonText = startIndex !== -1 ? text.slice(startIndex + 3) : ""; // If '###' not found, jsonText is an empty string

  // console.log(
  //   "jsonText: Text=" +
  //     jsonText +
  //     ", length=" +
  //     String(jsonText).length +
  //     ", index=" +
  //     startIndex
  // );

  if (!jsonText) {
    // JSON 형식의 text가 없을 경우, output을 null로 리턴
    return { regularText, output: null };
  }

  try {
    // Parse JSON text to JavaScript object
    const correctedJsonText = jsonText.replace(/\\/g, "");
    console.log("collectedJsonText=" + correctedJsonText);
    const jsonObject = JSON.parse(correctedJsonText);

    if (jsonObject["Output"]) {
      // Extract the properties of the Output class from jsonObject
      numCPU = parseInt(jsonObject["Output"].numCPU) || null;
      if (numCPU) {
        sizeMemory = parseInt(jsonObject["Output"].sizeMemory) || null;
        osTemplate = jsonObject["Output"].osTemplate || null;
      }
      sizeStorage = parseInt(jsonObject["Output"].sizeStorage) || null;
      numNode = parseInt(jsonObject["Output"].numNode) || null;
      const workIntention = jsonObject["Output"].workIntention || null;
      const intent = jsonObject["Output"].intent || null;

      // TBD: CPU 수량이 특정되지 않았을 때 메모리, OS 템플릿 입력 처리 방안
      // 1. 코드에서 코어 수량 미입력 시 메모리, OS 템플릿 입력값을 처리하지 않도록 하는 방법이 있고
      // 2. Prompt에서 입력 처리를 하지 않거나 Validation 처리하는 방법이 있는데. Prompt 처리할 경우 예외적인 상황이 벌어질 확률이 확률이 많을 것으로 판단됨.
      // 우선 Prompt에서 처리하도록 해보고 안되면 코드에서 처리하는 것으로 해보자.
      // 시험 결과: Prompt에서 값을 추출하는 것을 막기는 어려다. 대화상으로는 자연스럽지만 값을 강제하진 못함.

      // Create an Output object
      const output = new Instance(
        numCPU,
        sizeMemory,
        osTemplate,
        sizeStorage,
        numNode
      );

      // numCPU가 선택되면 numCPU에 따른 memory 리스트를 CMP에서 조회
      // console.log("------------>sizeMemory=" + sizeMemory);
      if (numCPU) {
        cmpApi.getRecommendedMemory(req, numCPU);
        cmpApi.getRecommendedOS(req, numCPU);

        // console.log(
        //   "at parseText(), req.session.instanceMemoryList=" +
        //     req.session.instanceMemoryList
        // );
      }
      return { regularText, output, workIntention, intent };
    } else {
      console.error("JSON does not contain Output property");
      return { regularText, output: null, workIntention: null, intent: null };
    }
  } catch (error) {
    console.error("Error parsing JSON:", error);
    // JSON 파싱에 오류가 발생한 경우, output을 null로 리턴
    return { regularText, output: null, workIntention: null, intent: null };
  }
}

function resetContex() {}

module.exports = {
  Instance: Instance,
  parseText: parseText,
  makeInstanceContext: makeInstanceContext,
  makeClusterContext: makeClusterContext,
};
