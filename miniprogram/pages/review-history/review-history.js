const store = require("../../services/store");

Page({
  data: { tab: "history", entries: [], logs: [], loading: true },
  onLoad(options = {}) { this.setData({ tab: options.tab === "free" ? "free" : "history" }); },
  onShow() { this.load(); },
  async load() {
    try {
      const [entries, logs] = await Promise.all([store.list("entries", "updatedAt"), store.list("logs", "reviewedAt")]);
      const map = Object.fromEntries(entries.map((entry) => [entry._id, entry]));
      this.setData({ entries, logs: logs.map((log) => ({ ...log, entry: map[log.entryId], result: log.rating === "remembered" ? "记得" : "忘了" })).filter((log) => log.entry), loading: false });
    } catch (error) { this.setData({ loading: false }); wx.showToast({ title: "加载失败，请重试", icon: "none" }); }
  },
  goBack() { wx.navigateBack(); },
  selectTab(event) { this.setData({ tab: event.currentTarget.dataset.tab }); },
  reviewEntry(event) { wx.navigateTo({ url: `/pages/review/review?practice=1&entryId=${event.currentTarget.dataset.id}` }); },
  reviewAll() { if (this.data.entries.length) wx.navigateTo({ url: "/pages/review/review?practice=1" }); },
});
