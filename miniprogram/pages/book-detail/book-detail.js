const store = require("../../services/store");

Page({
  data: { id: "", book: null, entries: [], query: "" },
  onLoad(options) { this.setData({ id: options.id || "" }); },
  onShow() { this.load(); },
  async load() {
    const [books, entries] = await Promise.all([store.list("books", "createdAt"), store.list("entries", "updatedAt")]);
    const book = books.find((item) => item._id === this.data.id);
    if (book) wx.setNavigationBarTitle({ title: book.name });
    this.allEntries = entries.filter((entry) => entry.bookId === this.data.id);
    this.setData({ book, entries: this.filter(this.data.query) });
  },
  filter(query) {
    const value = (query || "").trim().toLowerCase();
    return value ? this.allEntries.filter((entry) => entry.english.toLowerCase().includes(value) || entry.meaning.includes(value)) : this.allEntries;
  },
  search(event) { const query = event.detail.value; this.setData({ query, entries: this.filter(query) }); },
  goBack() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: "/pages/books/books" }) }); },
  addEntry() { wx.navigateTo({ url: `/pages/entry/entry?bookId=${this.data.id}` }); },
  editEntry(event) { wx.navigateTo({ url: `/pages/entry/entry?id=${event.currentTarget.dataset.id}` }); },
  deleteEntry(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({ title: "删除这条内容？", content: "删除后无法恢复。", success: async (result) => { if (result.confirm) { await store.remove("entries", id); await this.load(); } } });
  },
});
