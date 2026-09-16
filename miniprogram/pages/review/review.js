const store = require("../../services/store");
const speech = require("../../services/speech");
const { INTERVAL_DAYS } = require("../../utils/review");

function decorate(entry, books = []) {
  const labels = { word: "单词", phrase: "词组", sentence: "句子" };
  const book = books.find((item) => item._id === entry.bookId);
  return { ...entry, typeLabel: labels[entry.type] || "内容", bookName: book ? book.name : "我的词书" };
}

Page({
  data: { queue: [], current: null, index: 0, revealed: false, submitting: false, speaking: false, speechError: "" },
  async onLoad(options = {}) {
    const practice = options.practice === "1";
    const [allEntries, books] = await Promise.all([store.list("entries", "updatedAt"), store.list("books", "createdAt")]);
    const rawQueue = practice ? allEntries.filter((entry) => !options.entryId || entry._id === options.entryId) : allEntries.filter((entry) => new Date(entry.dueAt).getTime() <= Date.now());
    const queue = rawQueue.map((entry) => decorate(entry, books));
    if (!queue.length) return wx.reLaunch({ url: "/pages/complete/complete?count=0" });
    this.setData({ queue, current: queue[0], rememberDays: INTERVAL_DAYS[queue[0].stage || 0], practice });
  },
  reveal() { this.setData({ revealed: true }); },
  rememberAndNext() { return this.submitRating("remembered"); },
  goBack() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: "/pages/today/today" }) }); },
  rate(event) { return this.submitRating(event.currentTarget.dataset.rating); },
  async submitRating(rating) {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      if (!this.data.practice) await store.submitReview(this.data.current, rating);
      const nextIndex = this.data.index + 1;
      if (nextIndex >= this.data.queue.length) {
        if (!this.data.practice) await store.completeCheckIn(this.data.queue.length);
        return wx.reLaunch({
          url: `/pages/complete/complete?count=${this.data.queue.length}`,
          fail: () => {
            this.setData({ submitting: false });
            wx.showToast({ title: "进入完成页失败，请重试", icon: "none" });
          },
        });
      }
      const current = this.data.queue[nextIndex];
      this.setData({ index: nextIndex, current, rememberDays: INTERVAL_DAYS[current.stage || 0], revealed: false, submitting: false });
    } catch (error) {
      this.setData({ submitting: false });
      wx.showModal({ title: "提交失败", content: "当前卡片已保留，请检查网络后重试。", showCancel: false });
    }
  },
  async speak(event = {}) {
    const text = event.currentTarget && event.currentTarget.dataset.text || this.data.current.english;
    if (this.data.speaking) return;
    this.setData({ speaking: true, speechError: "" });
    try {
      await speech.play(text, {
        onPlay: () => this.setData({ speaking: true }),
        onEnded: () => this.setData({ speaking: false }),
        onError: () => this.setData({ speaking: false, speechError: "音频播放失败，点喇叭重试。" }),
      });
    } catch (error) {
      this.setData({ speaking: false, speechError: error.message || "发音暂时不可用，点喇叭重试。" });
    }
  },
  onUnload() { speech.stop(); },
});
