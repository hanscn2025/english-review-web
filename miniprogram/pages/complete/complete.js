Page({
  data: { count: 0 },
  onLoad(options) { this.setData({ count: Number(options.count || 0) }); },
  backToday() { wx.switchTab({ url: "/pages/today/today" }); },
  addEntry() { wx.redirectTo({ url: "/pages/entry/entry" }); },
});
