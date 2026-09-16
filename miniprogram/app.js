App({
  globalData: {
    cloudReady: false,
    cloudEnvId: "dayword-test-d0gnha0r1d3d83f55",
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用支持云开发的微信基础库");
      return;
    }
    wx.cloud.init({
      env: this.globalData.cloudEnvId,
      traceUser: true,
    });
    if (wx.setInnerAudioOption) {
      wx.setInnerAudioOption({ obeyMuteSwitch: false, mixWithOther: true });
    }
    this.globalData.cloudReady = true;
  },
});
