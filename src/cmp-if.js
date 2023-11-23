const axios = require("axios");
require("dotenv").config();

const cmpHeaders = {
  // Authorization: `Bearer ${process.env.CMP_API_KEY}`,
  "Content-Type": "application/json",
};

function getRecommendedCPU(req) {
  const url = `${process.env.CMP_URL}/catalog/v1/product-recommendation/cpu/select-list`;
  let cpuList = null;

  console.log(url);

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      // console.log("result: " + JSON.stringify(response.data.result));
      cpuList = response.data.result;
      req.session.instanceCoreList = cpuList
        .map((item) => item.value)
        .join(", ");
      // console.log(
      //   "req.session.instanceCoreList=" + req.session.instanceCoreList
      // );
    })
    .catch((error) => {
      console.error(error);
    });

  // return cpuList;
}

function getRecommendedStorage(req) {
  const url = `${process.env.CMP_URL}/catalog/v1/product-recommendation/blockstorage-size/select-list`;
  let storageList = null;

  console.log(url);

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      storageList = response.data.result;
      // console.log("result: " + JSON.stringify(storageList));
      req.session.instanceStorageList = storageList
        .map((item) => item.value)
        .join(", ");
      // console.log(
      //   "req.session.instanceStorageList=" + req.session.instanceStorageList
      // );
    })
    .catch((error) => {
      console.error(error);
    });

  // return storageList;
}

function getRecommendedMemory(req, numCPU) {
  const url = `${process.env.CMP_URL}/catalog/v1/product-recommendation/memory/select-list?vcpu=${numCPU}`;
  let memoryList = null;

  console.log(url);

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      memoryList = response.data.result;
      // console.log("result: " + JSON.stringify(memoryList));
      req.session.instanceMemoryList = memoryList
        .map((item) => item.value)
        .join(", ");
      // console.log(
      //   "req.session.instanceMemoryList=" + req.session.instanceMemoryList
      // );
      req.session.save((err) => {
        // console.log("req.session.instanceMemoryList was saved...");
      });
    })
    .catch((error) => {
      console.error(error);
    });

  // return memoryList;
}

function getRecommendedOS(req, numCPU) {
  const url = `${process.env.CMP_URL}/catalog/v1/product-recommendation/os-group/select-list?vcpu=${numCPU}`;
  let osList = null;

  console.log(url);

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      osList = response.data.result;
      // console.log("result: " + JSON.stringify(osList));
      req.session.instanceOsList = osList.map((item) => item.value).join(", ");
      // console.log("req.session.instanceOsList=" + req.session.instanceOsList);
      req.session.save((err) => {
        // console.log("req.session.instanceOsList was saved...");
      });
    })
    .catch((error) => {
      console.error(error);
    });

  // return osList;
}

function getRecommendedInstance(req) {
  const vCpu = req.session.instance.numCPU;
  const memory = req.session.instance.sizeMemory;
  const osGroup = req.session.instance.osTemplate;
  const blockStorageSize = req.session.instance.sizeStorage;

  if (!(vCpu && memory && osGroup && blockStorageSize)) {
    console.log(
      `미입력값이 존재 합니다. vCPU=${vCpu}, memory=${memory}, osGroup=${osGroup}, blockStorageSize=${blockStorageSize}`
    );
    return;
  }
  // http://172.16.10.168:3001/catalog/v1/product-recommendation/list?vCpu=2&memory=4&osGroup=Ubuntu&blockstorageSize=30
  // const url = `http://172.16.10.168:3001/catalog/v1/product-recommendation/list?vCpu=${vCpu}&memory=${memory}&osGroup=${osGroup}&blockstorageSize=${blockStorageSize}`;
  const url = `${process.env.CMP_URL}/catalog/v1/product-recommendation/list?vCpu=${vCpu}&memory=${memory}&osGroup=${osGroup}&blockstorageSize=${blockStorageSize}`;
  let instance = null;

  console.log(url);

  // 추천 Instance가 없을 때 처리 방안
  // 추천 Instance가 없으면 response.data.result.content[]에 값이 없이 return 함
  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      instance = response.data.result.content[0];
      console.log("instance list result: " + JSON.stringify(instance));
      if (instance) {
        req.session.recommendedInstance = instance;
        req.session.save((err) => {
          console.log("req.session.recommendedInstance was saved...");
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

async function createInstance(req) {
  // // TEST code
  // // req.session.recommendedInstanceStatus = `생성중`;
  // req.session.recommendedInstanceStatus = `생성 완료, VM 이름은 aws-server-3752fae1-0fe1-4611-9421-222800b2d9b0입니다.`;
  // // req.session.recommendedInstanceStatus = `생성 실패, 에러 코드: 40001`;
  // console.log(
  //   "createInstance() recommendedInstanceStatus: " +
  //     req.session.recommendedInstanceStatus
  // );
  // return;
  // // End of TEST code
  const vCpu = req.session.instance.numCPU;
  const memory = req.session.instance.sizeMemory;
  const osGroup = req.session.instance.osTemplate;
  const blockStorageSize = req.session.instance.sizeStorage;
  const recommendedInstance = req.session.recommendedInstance;
  let vmName = null;

  if (!(vCpu && memory && osGroup && blockStorageSize && recommendedInstance)) {
    console.log("createInstance() 미입력값이 존재 합니다.");
    console.log("vCpu=" + vCpu);
    console.log("memory=" + memory);
    console.log("osGroup=" + osGroup);
    console.log("blockStorageSize=" + blockStorageSize);
    console.log("recommendedInstance=" + JSON.stringify(recommendedInstance));

    const returnCode = "inputting";
    return { returnCode, vmName: null };
  }
  const url = `${process.env.CMP_URL}/imp/v1/virtual-server`;

  req.session.recommendedInstanceStatus = `생성중`;
  // 필수 입력
  const imageId = recommendedInstance.imageCode;
  const vmType = recommendedInstance.instanceType;
  const regionName = recommendedInstance.regionCode;
  const cloudType = recommendedInstance.cloudType;
  const volumeList = [
    {
      volumeType: recommendedInstance.storageTypeCode,
      rootDevice: true,
      volumeSize: recommendedInstance.storageSize,
    },
  ];

  // 조건: autoXXXX true 설정에 따라 자동 생성
  // keyName, securityGroupIdList, subnetId, publicIp, serviceGroupUuid
  const autoAssignKeypair = true; // keyName 자동 할당
  const autoAssignSecurityGroupList = true; // securityGroupList 자동 할당
  const autoAssignSubnet = true; // subnetId 자동 할당
  const autoAssignPublicIp = true; // publicIp 자동 할당
  const autoAssignServiceGroup = true; // serviceGroupUuid 자동 할당

  // const vmName = null; // null이면 자동 생성
  // const vmCount = 1; // default 1

  console.log("createInstance() url=" + url);

  axios
    .post(
      url,
      {
        imageId: imageId,
        vmType: vmType,
        volumeList: volumeList,
        autoAssignPublicIp: autoAssignPublicIp,
        autoAssignSubnet: autoAssignSubnet,
        autoAssignSecurityGroupList: autoAssignSecurityGroupList,
        autoAssignKeypair: autoAssignKeypair,
        autoAssignServiceGroup: autoAssignServiceGroup,
        regionName: regionName,
        cloudType: cloudType,
      },
      { headers: cmpHeaders }
    )
    .then((response) => {
      const message = response.data.message;
      const returnCode = message.code;
      if (message.code === "10001") {
        const result = response.data.result;
        console.log("message: " + JSON.stringify(message));
        console.log("result: " + JSON.stringify(result));
        vmName = result.vmName;
        req.session.recommendedInstanceStatus = `생성 완료, VM 이름은 ${vmName}입니다.`;
      } else {
        vmName = null;
        req.session.recommendedInstanceStatus = `생성 실패, 관리자에게 문의 바랍니다, 문의할 곳은 admin@strato-cmp.com 입니다\n 에러 코드: ${message.code}`;
      }
      req.session.save((err) => {});

      return { returnCode, vmName };
    })

    .catch((error) => {
      console.error(error);
      const returnCode = error.response.status;
      req.session.recommendedInstanceStatus = `생성 실패, 에러 코드: ${returnCode}`;
      req.session.save((err) => {});

      return { returnCode, vmName: null };
    });
}

// getRecommendedInstance(null, 2, 4, "Ubuntu", 30);

function getServiceGroup() {
  const url = `${process.env.CMP_URL}/imp/v1/service-group/select-list`;
  let serviceGroup = null;

  console.log(url);

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      serviceGroup = response.data.result;
      console.log("result: " + JSON.stringify(serviceGroup));
    })
    .catch((error) => {
      console.error(error);
    });

  return serviceGroup;
}

function getCloudType() {
  const serviceGroupUuid = "a753901c-c81e-4152-885c-3ef94518018e";
  const url = `${process.env.CMP_URL}/configuration/v1/cloud-type/list?serviceGroupUuid=${serviceGroupUuid}`;
  let cloudType = null;

  console.log(url);

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      cloudType = response.data.result;
      console.log("result: " + JSON.stringify(cloudType));
    })
    .catch((error) => {
      console.error(error);
    });

  return cloudType;
}

function getRegion() {
  const cloudType = "AWS";
  const url = `${process.env.CMP_URL}/configuration/v1/region/list?cloudType=${cloudType}`;
  let region = null;

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      region = response.data.result;
      console.log("result: " + JSON.stringify(region));
    })
    .catch((error) => {
      console.error(error);
    });

  return region;
}

function getInstanceFamily() {
  const cloudType = "AWS";
  const regionCode = "ap-northeast-2";
  const url = `${process.env.CMP_URL}/catalog/v1/instance-product/family/select-list?cloudType=${cloudType}&regionCode=${regionCode}`;
  let instanceFamily = null;

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      instanceFamily = response.data.result;
      console.log("result: " + JSON.stringify(instanceFamily));
    })
    .catch((error) => {
      console.error(error);
    });

  return instanceFamily;
}

function getInstances() {
  const cloudType = "AWS";
  const regionCode = "ap-northeast-2";
  const instanceFamily = "t3";
  const url = `${process.env.CMP_URL}/catalog/v1/instance-product/select-list?cloudType=${cloudType}&regionCode=${regionCode}&family=${instanceFamily}`;
  let instances = null;

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      instances = response.data.result;
      console.log("result: " + JSON.stringify(instances));
    })
    .catch((error) => {
      console.error(error);
    });

  return instances;
}

// OS는 productImageList.imageName을 선택하게 되어 있음, CMP 기준
//

function getStorages() {
  const cloudType = "AWS";
  const regionCode = "ap-northeast-2";
  const url = `${process.env.CMP_URL}/catalog/v1/block-storage-product/select-list?cloudType=${cloudType}&regionCode=${regionCode}`;
  let storages = null;

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      storages = response.data.result;
      console.log("result: " + JSON.stringify(storages)); // result.typeName 사용, CMP 기준, maxStorageSize는 무시해도 되는 것인가?
    })
    .catch((error) => {
      console.error(error);
    });

  return storages;
}

// Network 및 보안 구성
function getSubnet() {
  const serviceGroupUuid = "a753901c-c81e-4152-885c-3ef94518018e";
  const cloudType = "AWS";
  const regionCode = "ap-northeast-2";
  const url = `${process.env.CMP_URL}/imp/v1/subnet/select-list?cloudType=${cloudType}&serviceGroupUuid=${serviceGroupUuid}&regionName=${regionCode}`;
  let subnets = null;

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      subnets = response.data.result;
      console.log("result: " + JSON.stringify(subnets)); // result.subnetName 사용, CMP 기준
    })
    .catch((error) => {
      console.error(error);
    });

  return subnets;
}

function getKeyPair() {
  const regionCode = "ap-northeast-2";
  const url = `${process.env.CMP_URL}/imp/v1/keypair/select-list?regionName=${regionCode}`;
  let keypairs = null;

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      keypairs = response.data.result;
      console.log("result: " + JSON.stringify(keypairs)); // result.keyName 사용, CMP 기준
    })
    .catch((error) => {
      console.error(error);
    });

  return keypairs;
}

function getSecurityGroups() {
  const vpcId = "vpc-091cb35fb338c8664";
  const url = `${process.env.CMP_URL}/imp/v1/security-group/select-list?vpcId=${vpcId}`;
  let securityGroups = null;

  axios
    .get(url, { headers: cmpHeaders })
    .then((response) => {
      securityGroups = response.data.result;
      console.log("result: " + JSON.stringify(securityGroups)); // result.securityGroupName 사용, CMP 기준
    })
    .catch((error) => {
      console.error(error);
    });

  return securityGroups;
}

// 가상서버 생성
// http://172.16.10.168:3001/imp/v1/virtual-server
// {"serviceGroupUuid":"a753901c-c81e-4152-885c-3ef94518018e","serviceGroupName":"imp01","vmName":"qer","imageId":"ami-04a7c24c015ef1e4c","vmType":"t3.medium","regionName":"ap-northeast-2","cloudType":"AWS",
// "subnetId":"subnet-071278351e48e6f2a","publicIp":null,"securityGroupIdList":["sg-0b61dcfb88d63083c"],"keyName":"test-key","vmCount":1,"volumeList":[{"volumeType":"gp2","volumeSize":"2","rootDevice":true}],"autoAssignPublicIp":true}
// {"message":{"code":"10001","message":"Succeeded.","detail":null},"result":null}

function makeVirtualServer() {
  const serviceGroupUuid = "a753901c-c81e-4152-885c-3ef94518018e";
  const serviceGroupName = "imp01";
  const vmName = "test-jhlee";
  const imageId = "ami-04a7c24c015ef1e4c";
  const vmType = "t3.medium";
  const regionName = "ap-northeast-2";
  const cloudType = "AWS";
  const subnetId = "subnet-071278351e48e6f2a";
  const publicIp = null;
  const securityGroupIdList = ["sg-0b61dcfb88d63083c"];
  const keyName = "test-key";
  const vmCount = 1;
  const volumeList = [{ volumeType: "gp2", volumeSize: "2", rootDevice: true }];
  const autoAssignPublicIp = true;

  const url = `${process.env.CMP_URL}/imp/v1/virtual-server`;

  axios
    .put(
      url,
      {
        serviceGroupUuid: serviceGroupUuid,
        serviceGroupName: serviceGroupName,
        vmName: vmName,
        imageId: imageId,
        vmType: vmType,
        regionName: regionName,
        cloudType: cloudType,
        subnetId: subnetId,
        publicIp: publicIp,
        securityGroupIdList: securityGroupIdList,
        keyName: keyName,
        vmCount: vmCount,
        volumeList: volumeList,
        autoAssignPublicIp: autoAssignPublicIp,
      },
      { headers: cmpHeaders }
    )
    .then((response) => {
      result = response.data.message;
      console.log("result: " + JSON.stringify(result)); //
      return result.code;
    })
    .catch((error) => {
      console.error(error);
    });
}

module.exports = {
  getRecommendedCPU: getRecommendedCPU,
  getRecommendedStorage: getRecommendedStorage,
  getRecommendedOS: getRecommendedOS,
  getRecommendedMemory: getRecommendedMemory,
  getRecommendedInstance: getRecommendedInstance,
  createInstance: createInstance,
};
