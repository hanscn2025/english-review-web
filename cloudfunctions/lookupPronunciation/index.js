const https = require("https");
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 5000, headers: { "User-Agent": "Dayword/1.0" } }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if (response.statusCode !== 200) return reject(new Error(`词典返回 ${response.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    }).on("error", reject);
  });
}

exports.main = async (event) => {
  const word = String(event.word || "").trim().toLowerCase();
  if (!/^[a-z]+(?:['-][a-z]+)*$/.test(word)) return { ok: true, ipa: "" };
  try {
    const data = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    const first = Array.isArray(data) ? data[0] : null;
    const phonetic = first && ((first.phonetics || []).find((item) => item.text) || {}).text;
    return { ok: true, ipa: phonetic || (first && first.phonetic) || "" };
  } catch (error) {
    console.warn("lookupPronunciation", error.message);
    return { ok: true, ipa: "" };
  }
};
