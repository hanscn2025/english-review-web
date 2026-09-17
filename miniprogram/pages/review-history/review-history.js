const store = require("../../services/store");

Page({
  data: { tab: "history", entries: [], logs: [], loading: true, loadError: "" },
  onLoad(options = {}) { this.setData({ tab: options.tab === "free" ? "free" : "history" }); },
  onShow() { this.load(); },
  async load() {
    this.setData({ loading: true, loadError: "" });
    try {
      const [entries, logs] = await Promise.all([store.list("entries", "updatedAt"), store.list("logs", "reviewedAt")]);
      const entriesById = {};
      entries.forEach((entry) => { entriesById[entry._id] = entry; });
      const reviewLogs = [];
      logs.forEach((log) => {
        const entry = entriesById[log.entryId];
        if (!entry) return;
        reviewLogs.push({
          _id: log._id,
          entry,
          rating: log.rating,
          result: log.rating === "remembered" ? "记得" : "忘了",
        });
      });
      this.setData({ entries, logs: reviewLogs, loading: false });
    } catch (error) {
      this.setData({ loading: false, loadError: "复习内容加载失败，请检查网络后重试。" });
    }
  },
  retryLoad() { this.load(); },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: "/pages/today/today" });
  },
  selectTab(event) { this.setData({ tab: event.currentTarget.dataset.tab }); },
  reviewEntry(event) { wx.navigateTo({ url: `/pages/review/review?practice=1&entryId=${event.currentTarget.dataset.id}` }); },
  reviewAll() { if (this.data.entries.length) wx.navigateTo({ url: "/pages/review/review?practice=1" }); },
});
