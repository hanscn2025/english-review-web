const crypto = require("crypto");
const https = require("https");
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function hmac(key, value, encoding) { return crypto.createHmac("sha256", key).update(value).digest(encoding); }

function callTencent({ host, service, action, version, region = "ap-shanghai", payload }) {
  const secretId = process.env.TENCENTCLOUD_SECRETID;
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY;
  const token = process.env.TENCENTCLOUD_SESSIONTOKEN;
  if (!secretId || !secretKey) return Promise.reject(new Error("云函数运行凭证不可用"));
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const body = JSON.stringify(payload);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
  const signedHeaders = "content-type;host";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(body)}`;
  const scope = `${date}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${scope}\n${sha256(canonicalRequest)}`;
  const signingKey = hmac(hmac(hmac(`TC3${secretKey}`, date), service), "tc3_request");
  const headers = {
    Authorization: `TC3-HMAC-SHA256 Credential=${secretId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${hmac(signingKey, stringToSign, "hex")}`,
    "Content-Type": "application/json; charset=utf-8", Host: host,
    "X-TC-Action": action, "X-TC-Version": version, "X-TC-Timestamp": String(timestamp), "X-TC-Region": region,
  };
  if (token) headers["X-TC-Token"] = token;
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: host, method: "POST", path: "/", headers }, (response) => {
      let bodyText = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { bodyText += chunk; });
      response.on("end", () => {
        try {
          const parsed = JSON.parse(bodyText).Response || {};
          if (parsed.Error) return reject(new Error(parsed.Error.Message));
          resolve(parsed);
        } catch (error) { reject(error); }
      });
    });
    request.setTimeout(2500, () => request.destroy(new Error("识别服务响应超时")));
    request.on("error", reject);
    request.end(body);
  });
}

exports.main = async (event) => {
  try {
    if (event.kind === "speech") {
      const data = String(event.data || "");
      if (!data) return { ok: false, message: "没有收到识别内容" };
      const result = await callTencent({
        host: "asr.tencentcloudapi.com", service: "asr", action: "SentenceRecognition", version: "2019-06-14",
        payload: { EngSerViceType: "16k_en", SourceType: 1, VoiceFormat: "mp3", Data: data, DataLen: Number(event.dataLen || 0), FilterPunc: 0 },
      });
      return { ok: true, text: String(result.Result || "").trim() };
    }
    if (event.kind === "image") {
      if (!event.fileID) return { ok: false, message: "没有收到图片" };
      const downloaded = await cloud.downloadFile({ fileID: event.fileID });
      const data = downloaded.fileContent.toString("base64");
      const result = await callTencent({
        host: "ocr.tencentcloudapi.com", service: "ocr", action: "GeneralEfficientOCR", version: "2018-11-19",
        payload: { ImageBase64: data },
      });
      const text = (result.TextDetections || []).map((item) => item.DetectedText).join("\n").trim();
      return { ok: true, text };
    }
    return { ok: false, message: "不支持的识别类型" };
  } catch (error) {
    console.error("recognizeInput", error);
    return { ok: false, message: error.message || "识别失败" };
  }
};
