const store = require("../../services/store");
const { dateKey } = require("../../utils/review");

function recentCheckDays(checkIns = []) {
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    return { key, label: weekdays[date.getDay()], day: date.getDate(), checked: checkIns.some((item) => item.date === key) };
  });
}

function todayLabel() {
  const date = new Date();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

Page({
  data: { dueCount: 0, books: [], checkDays: recentCheckDays(), todayLabel: todayLabel(), streakCount: 0, loading: true, cloudError: "" },
  onShow() { this.load(); },
  async load() {
    try {
      const [due, books, entries, checkIns] = await Promise.all([
        store.dueEntries(), store.list("books", "createdAt"), store.list("entries", "updatedAt"), store.list("checkIns", "completedAt"),
      ]);
      this.setData({
        dueCount: due.length,
        books: books.slice(0, 2).map((book) => ({ ...book, count: entries.filter((entry) => entry.bookId === book._id).length })),
        checkDays: recentCheckDays(checkIns),
        todayLabel: todayLabel(),
        streakCount: checkIns.length,
        loading: false,
        cloudError: "",
      });
    } catch (error) {
      this.setData({ loading: false, cloudError: "云端尚未关联，打卡记录暂时无法同步" });
    }
  },
  startReview() { if (this.data.dueCount) wx.navigateTo({ url: "/pages/review/review" }); },
  openReviewHistory() { this.openReviewCenter("history"); },
  openFreeReview() { this.openReviewCenter("free"); },
  openReviewCenter(tab) {
    wx.navigateTo({
      url: `/pages/review-history/review-history?tab=${tab}`,
      fail() { wx.showToast({ title: "页面打开失败，请重试", icon: "none" }); },
    });
  },
  addEntry() { wx.navigateTo({ url: "/pages/entry/entry" }); },
  openTranslate() { wx.switchTab({ url: "/pages/translate/translate" }); },
  openBooks() { wx.switchTab({ url: "/pages/books/books" }); },
  openBook(event) { wx.navigateTo({ url: `/pages/book-detail/book-detail?id=${event.currentTarget.dataset.id}` }); },
});
