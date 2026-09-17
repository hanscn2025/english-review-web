const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const storage = {};
const wx = {
  getStorageSync(key) { return storage[key]; },
  setStorageSync(key, value) { storage[key] = value; },
};

const source = fs.readFileSync(path.join(__dirname, "../miniprogram/utils/ai-usage.js"), "utf8");
const sandbox = { module: { exports: {} }, exports: {}, wx, Date };
vm.runInNewContext(source, sandbox, { filename: "ai-usage.js" });
const usage = sandbox.module.exports;

test("同一缓存键可以直接复用结果", () => {
  const key = usage.cacheKey("translation", ["English", "简体中文", "Hello"]);
  usage.saveCached(key, "你好");
  assert.equal(usage.getCached(key), "你好");
});

test("每日智能调用限制为 30 次", () => {
  delete storage.daywordAiUsageV1;
  for (let index = 0; index < usage.DAILY_LIMIT; index += 1) usage.takeQuota();
  assert.throws(() => usage.takeQuota(), /30 次/);
});
