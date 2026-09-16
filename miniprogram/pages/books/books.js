const store = require("../../services/store");

Page({
  data: { books: [], entries: [], name: "", adding: false },
  onShow() { this.load(); },
  async load() {
    const [books, entries] = await Promise.all([store.list("books", "createdAt"), store.list("entries", "updatedAt")]);
    const now = Date.now();
    this.setData({ books: books.map((book) => { const bookEntries = entries.filter((entry) => entry.bookId === book._id); return { ...book, count: bookEntries.length, due: bookEntries.filter((entry) => new Date(entry.dueAt).getTime() <= now).length }; }), entries });
  },
  showAdd() { this.setData({ adding: true }); },
  hideAdd() { this.setData({ adding: false, name: "" }); },
  inputName(event) { this.setData({ name: event.detail.value }); },
  async addBook() {
    const name = this.data.name.trim();
    if (!name) return wx.showToast({ title: "请输入词书名称", icon: "none" });
    if (this.data.books.some((book) => book.name.toLowerCase() === name.toLowerCase())) return wx.showToast({ title: "已有同名词书", icon: "none" });
    await store.add("books", { name });
    this.hideAdd(); await this.load();
  },
  openBook(event) { wx.navigateTo({ url: `/pages/book-detail/book-detail?id=${event.currentTarget.dataset.id}` }); },
});
