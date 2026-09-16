const crypto = require("crypto");
const https = require("https");
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const HOST = "tts.tencentcloudapi.com";
const SERVICE = "tts";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value).digest(encoding);
}

function requestSpeech(payload) {
  const secretId = process.env.TENCENTCLOUD_SECRETID;
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY;
  const token = process.env.TENCENTCLOUD_SESSIONTOKEN;
  if (!secretId || !secretKey) throw new Error("云函数运行凭证不可用");

  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const body = JSON.stringify(payload);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${HOST}\nx-tc-action:texttovoice\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(body)}`;
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const secretDate = hmac(`TC3${secretKey}`, date);
  const secretService = hmac(secretDate, SERVICE);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmac(secretSigning, stringToSign, "hex");
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = {
    Authorization: authorization,
    "Content-Type": "application/json; charset=utf-8",
    Host: HOST,
    "X-TC-Action": "TextToVoice",
    "X-TC-Version": "2019-08-23",
    "X-TC-Timestamp": String(timestamp),
    "X-TC-Region": "ap-shanghai",
  };
  if (token) headers["X-TC-Token"] = token;

  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: HOST, method: "POST", path: "/", headers }, (response) => {
      let result = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { result += chunk; });
      response.on("end", () => {
        try {
          const parsed = JSON.parse(result);
          if (parsed.Response && parsed.Response.Error) return reject(new Error(parsed.Response.Error.Message));
          resolve(parsed.Response || {});
        } catch (error) {
          reject(error);
        }
      });
    });
    request.setTimeout(2400, () => request.destroy(new Error("语音服务响应超时")));
    request.on("error", reject);
    request.end(body);
  });
}

exports.main = async (event) => {
  const text = String(event.text || "").trim();
  if (!text || text.length > 500) {
    return { ok: false, message: "朗读内容不能为空且不超过 500 字符" };
  }

  const isChinese = /[\u3400-\u9fff]/.test(text);
  const voiceType = isChinese ? 1001 : 1051;
  const primaryLanguage = isChinese ? 1 : 2;
  const hash = crypto.createHash("sha256").update(`${voiceType}:0:${text}`).digest("hex");
  try {
    const result = await requestSpeech({
      Text: text,
      SessionId: hash.slice(0, 32),
      VoiceType: voiceType,
      PrimaryLanguage: primaryLanguage,
      Codec: "mp3",
      SampleRate: 16000,
      Speed: 0,
      Volume: 0,
    });
    if (!result || !result.Audio) throw new Error("语音服务未返回音频");
    return { ok: true, audioBase64: result.Audio, cacheKey: hash };
  } catch (error) {
    console.error("synthesizeSpeech", error);
    return { ok: false, message: error.message || "发音生成失败" };
  }
};
