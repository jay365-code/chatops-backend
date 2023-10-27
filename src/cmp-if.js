const axios = require("axios");
require("dotenv").config();

const cmpHeaders = {
  // Authorization: `Bearer ${process.env.CMP_API_KEY}`,
  "Content-Type": "application/json",
};

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

function getKeyparis() {
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

makeVirtualServer();

module.exports = {
  getServiceGroup: getServiceGroup,
};
