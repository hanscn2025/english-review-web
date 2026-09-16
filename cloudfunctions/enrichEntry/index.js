const https = require("https");
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "User-Agent": "Dayword/1.0" } }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if (response.statusCode !== 200) return resolve(null);
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.setTimeout(1800, () => request.destroy());
    request.on("error", () => resolve(null));
  });
}

async function lookupIpa(text) {
  const word = text.trim().toLowerCase();
  if (!/^[a-z]+(?:['-][a-z]+)*$/.test(word)) return "";
  const data = await fetchJson(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`);
  const simple = data && data.simple && data.simple.word && data.simple.word[0];
  const ec = data && data.ec && data.ec.word && data.ec.word[0];
  return (simple && (simple.usphone || simple.ukphone)) || (ec && (ec.usphone || ec.ukphone)) || "";
}

async function translate(text) {
  if (/^[a-z]+(?:['-][a-z]+)*$/i.test(text)) {
    const dictionary = await fetchJson(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(text)}`);
    const webTranslation = dictionary && dictionary.web_trans && dictionary.web_trans["web-translation"];
    const firstValue = Array.isArray(webTranslation) && webTranslation[0] && webTranslation[0].trans && webTranslation[0].trans[0] && webTranslation[0].trans[0].value;
    if (firstValue) return firstValue;
    throw new Error("公共词典暂时不可用");
  }
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
  const data = await fetchJson(url);
  const translation = Array.isArray(data && data[0])
    ? data[0].map((part) => (Array.isArray(part) ? part[0] : "")).join("")
    : "";
  if (!translation) throw new Error("公共翻译服务暂时不可用");
  return translation;
}

exports.main = async (event) => {
  const text = String(event.text || "").trim();
  if (!text || text.length > 500) return { ok: false, message: "请输入不超过 500 字符的英文" };
  try {
    const [translation, ipa] = await Promise.all([
      event.translate ? translate(text) : "",
      event.pronunciation ? lookupIpa(text) : "",
    ]);
    return { ok: true, translation, ipa };
  } catch (error) {
    console.error("enrichEntry", error);
    return { ok: false, message: error.message || "自动完善失败" };
  }
};
