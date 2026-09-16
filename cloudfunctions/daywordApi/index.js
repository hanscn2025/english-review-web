const cloudbase = require("@cloudbase/node-sdk");
const cloud = require("wx-server-sdk");
const crypto = require("crypto");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const app = cloudbase.init({});
const db = app.database();
const ALLOWED_COLLECTIONS = new Set(["books", "entries", "review_logs", "daily_checkins"]);
const collectionTasks = new Map();

async function ensureCollection(name) {
  if (!collectionTasks.has(name)) {
    const task = (async () => {
      try {
        await db.createCollection(name);
      } catch (error) {
        const message = String(error && (error.message || error));
        if (!/exist|exists|already|重复|已存在/i.test(message)) throw error;
      }
    })().catch((error) => {
      collectionTasks.delete(name);
      throw error;
    });
    collectionTasks.set(name, task);
  }
  return collectionTasks.get(name);
}

function collectionName(value) {
  if (!ALLOWED_COLLECTIONS.has(value)) throw new Error("不支持的数据集合");
  return value;
}

function cleanValue(value) {
  const result = { ...(value || {}) };
  delete result._id;
  delete result._openid;
  delete result.ownerId;
  return result;
}

function publicAccount(record) {
  if (!record) return null;
  return { accountId: record.accountId, nickname: record.nickname, createdAt: record.createdAt };
}

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) throw new Error("无法识别微信用户");

    if (event.action === "getAccount" || event.action === "login") {
      await ensureCollection("users");
      const users = db.collection("users");
      const existing = await users.where({ ownerId: OPENID }).limit(1).get();
      if (existing.data.length) return { ok: true, data: publicAccount(existing.data[0]) };
      if (event.action === "getAccount") return { ok: true, data: null };
      const now = new Date();
      const record = {
        ownerId: OPENID,
        accountId: `DW-${crypto.createHash("sha256").update(OPENID).digest("hex").slice(0, 8).toUpperCase()}`,
        nickname: "Dayword 用户",
        createdAt: now,
        updatedAt: now,
      };
      await users.add(record);
      return { ok: true, data: publicAccount(record) };
    }

    const name = collectionName(event.collection);
    await ensureCollection(name);
    const collection = db.collection(name);
    const now = new Date();

    if (event.action === "list") {
      let query = collection.where({ ownerId: OPENID });
      if (event.orderField) query = query.orderBy(event.orderField, "desc");
      const result = await query.limit(100).get();
      return { ok: true, data: result.data };
    }

    if (event.action === "add") {
      const record = { ...cleanValue(event.value), ownerId: OPENID, createdAt: now, updatedAt: now };
      const result = await collection.add(record);
      return { ok: true, data: { ...record, _id: result.id } };
    }

    if (event.action === "update" || event.action === "remove") {
      if (!event.id) throw new Error("缺少记录 ID");
      const owned = await collection.where({ _id: event.id, ownerId: OPENID }).limit(1).get();
      if (!owned.data.length) throw new Error("记录不存在或无权操作");
      if (event.action === "update") {
        await collection.doc(event.id).update({ ...cleanValue(event.value), updatedAt: now });
      } else {
        await collection.doc(event.id).remove();
      }
      return { ok: true };
    }

    throw new Error("不支持的操作");
  } catch (error) {
    console.error("daywordApi", error);
    return { ok: false, message: error.message || "云端请求失败" };
  }
};
