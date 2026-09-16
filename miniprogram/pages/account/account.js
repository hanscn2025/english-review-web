const store = require("../../services/store");

Page({
  data: { account: null, bookCount: 0, entryCount: 0, reviewCount: 0, checkInCount: 0, loading: true, loggingIn: false, error: "" },
  async onShow() {
    try {
      const [account, books, entries, logs, checkIns] = await Promise.all([store.getAccount(), store.list("books"), store.list("entries"), store.list("logs"), store.list("checkIns")]);
      this.setData({ account, bookCount: books.length, entryCount: entries.length, reviewCount: logs.length, checkInCount: checkIns.length, loading: false, error: "" });
    } catch (error) {
      this.setData({ loading: false, error: error.message || "账户信息加载失败" });
    }
  },
  async login() {
    if (this.data.loggingIn) return;
    this.setData({ loggingIn: true, error: "" });
    try {
      const account = await store.login();
      this.setData({ account });
      wx.showToast({ title: "登录成功", icon: "success" });
    } catch (error) {
      this.setData({ error: error.message || "登录失败，请重试" });
    } finally {
      this.setData({ loggingIn: false });
    }
  },
  openBooks() { wx.switchTab({ url: "/pages/books/books" }); },
  openReviews() { wx.navigateTo({ url: "/pages/review-history/review-history?tab=history" }); },
  openTranslate() { wx.switchTab({ url: "/pages/translate/translate" }); },
  showDataInfo() {
    wx.showModal({ title: "账号与数据", content: "登录身份由微信云开发确认。词书、学习内容、复习记录和打卡数据均按当前微信用户隔离存储。", showCancel: false, confirmText: "知道了" });
  },
});
