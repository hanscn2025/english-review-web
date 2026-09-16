const { scheduleReview, dateKey } = require("../utils/review");
const { userMessage } = require("../utils/error");

const COLLECTIONS = { books: "books", entries: "entries", logs: "review_logs", checkIns: "daily_checkins" };
const API_VERSION = "2026.09.16.1";

function cloudAvailable() {
  const app = getApp();
  return Boolean(wx.cloud && app && app.globalData.cloudReady);
}

async function callApi(action, payload) {
  if (!cloudAvailable()) throw new Error("云开发尚未初始化");
  try {
    const response = await wx.cloud.callFunction({ name: "daywordApi", data: { action, ...payload } });
    const result = response.result || {};
    if (result.apiVersion !== API_VERSION) throw new Error("apiVersion mismatch");
    if (!result.ok) throw new Error(result.message || "云端请求失败");
    return result;
  } catch (error) {
    throw new Error(userMessage(error, "云端数据加载失败，请稍后重试。"));
  }
}

async function list(collection, orderField) {
  const result = await callApi("list", { collection: COLLECTIONS[collection], orderField });
  return result.data;
}

async function add(collection, value) {
  const result = await callApi("add", { collection: COLLECTIONS[collection], value });
  return result.data;
}

async function update(collection, id, value) {
  await callApi("update", { collection: COLLECTIONS[collection], id, value });
}

async function remove(collection, id) {
  await callApi("remove", { collection: COLLECTIONS[collection], id });
}

async function getAccount() {
  const result = await callApi("getAccount", {});
  return result.data;
}

async function login() {
  const result = await callApi("login", {});
  return result.data;
}

async function dueEntries() {
  const entries = await list("entries", "updatedAt");
  const now = Date.now();
  return entries.filter((entry) => new Date(entry.dueAt).getTime() <= now);
}

async function submitReview(entry, rating) {
  const beforeStage = entry.stage || 0;
  const next = scheduleReview({ stage: beforeStage, dueAt: entry.dueAt }, rating);
  await update("entries", entry._id, { stage: next.stage, dueAt: next.dueAt, lastRating: rating, reviewedAt: next.reviewedAt });
  await add("logs", { entryId: entry._id, rating, reviewedAt: next.reviewedAt, beforeStage, afterStage: next.stage });
  return next;
}

async function completeCheckIn(reviewCount) {
  const today = dateKey();
  const existing = (await list("checkIns", "completedAt")).find((item) => item.date === today);
  if (existing) return existing;
  return add("checkIns", { date: today, completedAt: new Date(), reviewCount });
}

module.exports = { list, add, update, remove, getAccount, login, dueEntries, submitReview, completeCheckIn };
