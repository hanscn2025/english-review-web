const store = require("../../services/store");

function nextLabel(entries) {
  const times = entries.map((entry) => new Date(entry.dueAt).getTime()).filter((time) => Number.isFinite(time) && time > Date.now());
  if (!times.length) return "暂无待复习安排";
  const next = new Date(Math.min(...times));
  const today = new Date();
  if (next.toDateString() === today.toDateString()) return "今天稍后";
  return `${next.getMonth() + 1}月${next.getDate()}日`;
}

Page({
  data: { count: 0, remembered: 0, forgotten: 0, nextReview: "正在计算…" },
  onLoad(options) {
    this.setData({ count: Number(options.count || 0), remembered: Number(options.remembered || 0), forgotten: Number(options.forgotten || 0) });
    store.list("entries", "updatedAt").then((entries) => this.setData({ nextReview: nextLabel(entries) })).catch(() => this.setData({ nextReview: "稍后在今日页查看" }));
  },
  backToday() { wx.switchTab({ url: "/pages/today/today" }); },
  reviewHistory() { wx.redirectTo({ url: "/pages/review-history/review-history?tab=history" }); },
});
