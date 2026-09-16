const speech = require("../../services/speech");
const { userMessage } = require("../../utils/error");

Page({
  data: {
    source: "", translation: "", recognizing: false, translating: false, speaking: false, status: "", error: "", working: false,
    languages: ["自动检测", "简体中文", "English", "日本語", "한국어", "Français", "Español"], sourceIndex: 0, targetIndex: 1,
  },
  goBack() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: "/pages/today/today" }) }); },
  inputSource(event) { this.setData({ source: event.detail.value, translation: "", error: "" }); },
  clearSource() {
    if (this.data.working) return;
    speech.stop();
    this.setData({ source: "", translation: "", status: "", error: "", speaking: false });
  },
  chooseSource(event) { this.setData({ sourceIndex: Number(event.detail.value), translation: "" }); },
  chooseTarget(event) { this.setData({ targetIndex: Number(event.detail.value), translation: "" }); },
  swapLanguages() {
    if (this.data.sourceIndex === 0) return wx.showToast({ title: "先选择源语言", icon: "none" });
    this.setData({ sourceIndex: this.data.targetIndex, targetIndex: this.data.sourceIndex, source: this.data.translation || this.data.source, translation: this.data.translation ? this.data.source : "" });
  },
  uploadImage(path) {
    const extension = /\.([a-z0-9]+)$/i.exec(path);
    const cloudPath = `ocr/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension ? extension[1].toLowerCase() : "jpg"}`;
    return wx.cloud.uploadFile({ cloudPath, filePath: path });
  },
  fileSize(path) { return new Promise((resolve, reject) => wx.getFileSystemManager().getFileInfo({ filePath: path, success: (result) => resolve(result.size), fail: reject })); },
  compressImage(src, quality, compressedWidth) { return new Promise((resolve, reject) => wx.compressImage({ src, quality, compressedWidth, success: (result) => resolve(result.tempFilePath), fail: reject })); },
  async prepareImage(file) {
    let path = file.tempFilePath;
    let size = file.size || file.fileSize || await this.fileSize(path);
    if (size > 2 * 1024 * 1024) {
      path = await this.compressImage(path, 65, 1600);
      size = await this.fileSize(path);
    }
    if (size > 3 * 1024 * 1024) {
      path = await this.compressImage(path, 40, 1200);
      size = await this.fileSize(path);
    }
    if (size > 3.5 * 1024 * 1024) throw new Error("图片仍然过大，请裁剪后重新选择");
    return { tempFilePath: path, size };
  },
  async recognize(file) {
    this.setData({ recognizing: true, working: true, status: "正在识别图片文字…", error: "" });
    let fileID = "";
    try {
      const uploaded = await this.uploadImage(file.tempFilePath);
      fileID = uploaded.fileID;
      const response = await wx.cloud.callFunction({ name: "recognizeInput", data: { kind: "image", fileID } });
      const result = response.result || {};
      if (!result.ok || !result.text) throw new Error(result.message || "没有识别到英文内容");
      this.setData({ source: result.text.trim(), translation: "", status: "识别完成，正在翻译…" });
      await this.translate();
    } catch (error) {
      this.setData({ error: userMessage(error, "识别失败，请重试。"), status: "" });
    } finally {
      if (fileID) wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {});
      this.setData({ recognizing: false, working: false });
    }
  },
  async scanImage() {
    if (this.data.working) return;
    try {
      const result = await wx.chooseMedia({ count: 1, mediaType: ["image"], sourceType: ["camera", "album"], sizeType: ["compressed"] });
      if (result.tempFiles && result.tempFiles[0]) await this.recognize(await this.prepareImage(result.tempFiles[0]));
    } catch (error) {
      if (!/cancel/i.test(String(error && error.errMsg))) this.setData({ error: userMessage(error, "无法读取图片，请检查相机或相册权限。") });
    }
  },
  async translate() {
    const source = this.data.source.trim();
    if (!source || this.data.translating) return;
    this.setData({ translating: true, working: true, status: "正在翻译…", error: "" });
    try {
      if (!wx.cloud.extend || !wx.cloud.extend.AI) throw new Error("当前微信版本不支持云开发 AI，请升级微信");
      const model = wx.cloud.extend.AI.createModel("cloudbase");
      const sourceLanguage = this.data.languages[this.data.sourceIndex];
      const targetLanguage = this.data.languages[this.data.targetIndex];
      const response = await model.generateText({ model: "hy3", temperature: 0.1, max_tokens: 480, messages: [
        { role: "system", content: `你是专业翻译引擎。${sourceLanguage === "自动检测" ? "自动识别输入语言" : `输入语言为${sourceLanguage}`}，准确、自然地翻译为${targetLanguage}。保留原文语气、段落和专有名词，只输出译文，不解释，不使用 Markdown。` },
        { role: "user", content: source },
      ] });
      const text = response && response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content;
      if (!text) throw new Error("翻译服务没有返回结果");
      this.setData({ translation: String(text).trim(), status: "" });
      const history = wx.getStorageSync("translationHistory") || [];
      wx.setStorageSync("translationHistory", [{ source, translation: String(text).trim(), sourceLanguage, targetLanguage, createdAt: Date.now() }, ...history].slice(0, 20));
    } catch (error) {
      this.setData({ error: userMessage(error, "翻译失败，请重试。"), status: "" });
    } finally {
      this.setData({ translating: false, working: false });
    }
  },
  async play(text) {
    if (!text || this.data.speaking) return;
    this.setData({ speaking: true, error: "" });
    try { await speech.play(text, { onEnded: () => this.setData({ speaking: false }), onError: () => this.setData({ speaking: false, error: "播放失败，请重试。" }) }); }
    catch (error) { this.setData({ speaking: false, error: userMessage(error, "播放失败，请重试。") }); }
  },
  speakSource() { this.play(this.data.source); },
  speakTranslation() { this.play(this.data.translation); },
  copyTranslation() {
    if (!this.data.translation) return;
    wx.setClipboardData({
      data: this.data.translation,
      success: () => wx.showToast({ title: "译文已复制", icon: "success" }),
    });
  },
  showHistory() {
    const history = wx.getStorageSync("translationHistory") || [];
    if (!history.length) return wx.showToast({ title: "还没有翻译记录", icon: "none" });
    wx.showActionSheet({ itemList: history.slice(0, 6).map((item) => `${item.source.slice(0, 12)} → ${item.translation.slice(0, 12)}`), success: ({ tapIndex }) => this.setData({ source: history[tapIndex].source, translation: history[tapIndex].translation }) });
  },
  saveToBook() { wx.navigateTo({ url: `/pages/entry/entry?english=${encodeURIComponent(this.data.source)}&meaning=${encodeURIComponent(this.data.translation)}` }); },
  onUnload() { speech.stop(); },
});
