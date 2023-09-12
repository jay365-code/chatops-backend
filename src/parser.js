class Output {
    constructor(provider, numNodes, location) {
        this.provider = provider;
        this.numNodes = numNodes;
        this.location = location;
    }
}

function parseText(text) {
    // Find the index where JSON object starts
    const startIndex = text.indexOf('###');
    
    // Extract the regular text and JSON text
    const regularText = text.slice(0, startIndex).trim();
    const jsonText = text.slice(startIndex + 3); // Skip the '###'

    console.log("jsonText: Text=" + jsonText + ", length=" + String(jsonText).length + ", index=" + startIndex);
    
    if (!jsonText) {
        // JSON 형식의 text가 없을 경우, output을 null로 리턴
        return { regularText, output: null };
    }
    
    try {
        // Parse JSON text to JavaScript object
        const jsonObject = JSON.parse(jsonText);
        
        if (jsonObject['Output']) {
            // Extract the properties of the Output class from jsonObject
            const provider = jsonObject['Output'].Provider || null;
            const numNodes = jsonObject['Output'].NumNodes || null;
            const location = jsonObject['Output'].Location || null;
            
            // Create an Output object
            const output = new Output(provider, numNodes, location);
            
            return { regularText, output };
        } else {
            console.error("JSON does not contain Output property");
            return { regularText, output: null };
        }
    } catch (error) {
        console.error("Error parsing JSON:", error);
        // JSON 파싱에 오류가 발생한 경우, output을 null로 리턴
        return { regularText, output: null };
    }
}



// const text = `지역 정보가 누락되었습니다. 클러스터를 생성하기 위해선 지역 정보가 필요합니다. 지역 정보를 입력해주세요.

// {
//     "###Output": {
//         "Provider": "AWS",
//         "NumNodes": "5",
//         "Location": "미입력"
//     }
// }`;

// const { regularText, output } = parseText(text);

// console.log(regularText);
// console.log(output.provider);

const inputHistory = new Output("Azure");

function makeContext(inputHistory) {
    const provider = inputHistory.provider || "미입력";
    const numNodes = inputHistory.numNodes || "미입력";
    const location = inputHistory.location || "미입력";

    const context = `Context:\n--------------------\n클라우드 사업자: ${provider}\n노드 수량: ${numNodes}\n지역: ${location}\n--------------------\n`;
    
    return context;
}

function resetContex() {

}

// const context = makeContext(inputHistory);
// console.log(context);


module.exports = {
    Output: Output,
    parseText: parseText,
    makeContext: makeContext
}
