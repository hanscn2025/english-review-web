const CACHE_KEY = "daywordAiCacheV1";
const USAGE_KEY = "daywordAiUsageV1";
const DAILY_LIMIT = 30;
const CACHE_LIMIT = 100;

function dayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function cacheKey(kind, parts) {
  return [kind, ...parts].map((part) => String(part || "").trim().toLowerCase()).join("\n");
}

function readCache() {
  const value = wx.getStorageSync(CACHE_KEY);
  return Array.isArray(value) ? value : [];
}

function getCached(key) {
  const record = readCache().find((item) => item.key === key);
  return record ? record.value : null;
}

function saveCached(key, value) {
  const cache = readCache().filter((item) => item.key !== key);
  cache.unshift({ key, value, updatedAt: Date.now() });
  wx.setStorageSync(CACHE_KEY, cache.slice(0, CACHE_LIMIT));
}

function takeQuota() {
  const today = dayKey();
  const stored = wx.getStorageSync(USAGE_KEY) || {};
  const count = stored.date === today ? Number(stored.count || 0) : 0;
  if (count >= DAILY_LIMIT) throw new Error(`今天的智能翻译次数已用完（${DAILY_LIMIT} 次），请明天再试或手动填写。`);
  wx.setStorageSync(USAGE_KEY, { date: today, count: count + 1 });
  return DAILY_LIMIT - count - 1;
}

module.exports = { DAILY_LIMIT, cacheKey, getCached, saveCached, takeQuota, dayKey };
