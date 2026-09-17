const store = require("../../services/store");
const speech = require("../../services/speech");
const aiUsage = require("../../utils/ai-usage");

Page({
  data: {
    id: "", books: [], bookNames: [], bookIndex: 0, types: ["单词", "词组", "句子"], typeValues: ["word", "phrase", "sentence"], typeIndex: 0,
    english: "", meaning: "", ipa: "", exampleEn: "", exampleZh: "", saving: false, completing: false, speaking: false, recording: false, recognizing: false,
    englishDirty: false, completeError: "", speechError: "", bookPickerOpen: false, pendingBookIndex: 0, addingBook: false, newBookName: "", showAdvanced: false,
  },
  async onLoad(options) {
    try {
      this.options = options;
      const [books, entries] = await Promise.all([store.list("books", "createdAt"), store.list("entries", "updatedAt")]);
      let availableBooks = books;
      if (!availableBooks.length) availableBooks = [await store.add("books", { name: "我的英语" })];
      const entry = options.id ? entries.find((item) => item._id === options.id) : null;
      const selectedBookId = entry ? entry.bookId : options.bookId;
      const bookIndex = Math.max(0, availableBooks.findIndex((item) => item._id === selectedBookId));
      const typeIndex = entry ? Math.max(0, this.data.typeValues.indexOf(entry.type)) : 0;
      this.setData({
        id: options.id || "", books: availableBooks, bookNames: availableBooks.map((book) => book.name), bookIndex, typeIndex,
        english: entry ? entry.english : decodeURIComponent(options.english || ""), meaning: entry ? entry.meaning : decodeURIComponent(options.meaning || ""), ipa: entry ? entry.ipa || "" : "",
        exampleEn: entry ? entry.exampleEn || "" : "", exampleZh: entry ? entry.exampleZh || "" : "",
        englishDirty: false, completeError: "", showAdvanced: Boolean(entry && (entry.ipa || entry.exampleEn || entry.exampleZh)),
      });
      if (entry) wx.setNavigationBarTitle({ title: "编辑内容" });
    } catch (error) {
      wx.showModal({ title: "云端数据加载失败", content: error.message || "请检查网络后重新进入。", showCancel: false });
    }
  },
  field(event) {
    const name = event.currentTarget.dataset.field;
    const patch = { [name]: event.detail.value };
    if (name === "english") {
      patch.englishDirty = true;
      patch.completeError = "";
      patch.speechError = "";
      this.completeRequestId = (this.completeRequestId || 0) + 1;
    }
    this.setData(patch);
    if (name === "english") {
      clearTimeout(this.completeTimer);
      this.completeTimer = setTimeout(() => this.completeEnglish(), 700);
    }
  },
  goBack() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: "/pages/today/today" }) }); },
  openBookPicker() { this.setData({ bookPickerOpen: true, pendingBookIndex: this.data.bookIndex, addingBook: false, newBookName: "" }); },
  closeBookPicker() { this.setData({ bookPickerOpen: false, addingBook: false, newBookName: "" }); },
  selectBook(event) { this.setData({ pendingBookIndex: Number(event.currentTarget.dataset.index), addingBook: false }); },
  confirmBook() { this.setData({ bookIndex: this.data.pendingBookIndex, bookPickerOpen: false, addingBook: false, newBookName: "" }); },
  startNewBook() { this.setData({ addingBook: true, newBookName: "" }); },
  inputNewBookName(event) { this.setData({ newBookName: event.detail.value }); },
  pickType(event) { this.setData({ typeIndex: Number(event.detail.value) }); },
  selectType(event) { this.setData({ typeIndex: Number(event.currentTarget.dataset.index) }); },
  toggleAdvanced() { this.setData({ showAdvanced: !this.data.showAdvanced }); },
  enrichWithAI(text, includeIpa = false) {
    const key = aiUsage.cacheKey("entry", [includeIpa ? "with-ipa" : "translation-only", text]);
    const cached = aiUsage.getCached(key);
    if (cached) return Promise.resolve(cached);
    aiUsage.takeQuota();
    if (!wx.cloud.extend || !wx.cloud.extend.AI) return Promise.reject(new Error("当前微信版本不支持云开发 AI，请升级微信后重试"));
    const model = wx.cloud.extend.AI.createModel("cloudbase");
    return model.generateText({
      model: "hy3",
      temperature: 0.1,
      max_tokens: 180,
      messages: [
        { role: "system", content: `你是英语学习词典。把用户输入的英文准确翻译为简体中文。只输出一行严格 JSON，不解释、不使用 Markdown，格式为 {"translation":"中文释义","ipa":"美式IPA"}。单词的 translation 优先包含常用词性和核心释义；词组或句子输出自然译文。${includeIpa ? "这是单词，请给出可靠的美式 IPA；不确定时 ipa 留空。" : "ipa 必须留空。"}` },
        { role: "user", content: text },
      ],
    }).then((response) => {
      const content = response && response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content;
      if (!content) throw new Error("翻译服务未返回结果");
      const match = String(content).match(/\{[\s\S]*\}/);
      if (!match) throw new Error("翻译结果格式异常，请重试");
      const result = JSON.parse(match[0]);
      if (!result.translation) throw new Error("翻译服务未返回结果");
      const value = { translation: String(result.translation).trim(), ipa: String(result.ipa || "").trim() };
      aiUsage.saveCached(key, value);
      return value;
    });
  },
  translate(text) { return this.enrichWithAI(text, false).then((result) => result.translation); },
  friendlyError(error, fallback) {
    const message = String((error && error.message) || "");
    if (/TIME_LIMIT_EXCEEDED|timed out/i.test(message)) return "服务响应超时，请稍后重试，也可以手动填写。";
    return message && !/cloud\.callFunction|RequestId|callId/i.test(message) ? message : fallback;
  },
  async completeEnglish() {
    const english = this.data.english.trim();
    if (!english) return;
    if (this.data.completing) {
      this.completeQueued = true;
      return;
    }
    const requestId = this.completeRequestId || 0;
    this.completeQueued = false;
    this.setData({ completing: true });
    const words = english.split(/\s+/).filter(Boolean);
    if (this.data.typeIndex === 0 && words.length > 1) {
      this.setData({ typeIndex: /[.!?]$/.test(english) || words.length > 5 ? 2 : 1 });
    }
    const shouldRefresh = this.data.englishDirty;
    const shouldTranslate = shouldRefresh || !this.data.meaning;
    const shouldCompleteIpa = words.length === 1 && (shouldRefresh || !this.data.ipa);
    try {
      if (shouldTranslate || shouldCompleteIpa) {
        const result = await this.enrichWithAI(english, shouldCompleteIpa);
        if (this.data.english.trim() !== english || (this.completeRequestId || 0) !== requestId) return;
        const patch = {};
        if (shouldTranslate) patch.meaning = result.translation;
        if (shouldCompleteIpa) patch.ipa = result.ipa;
        if (words.length !== 1 && shouldRefresh) patch.ipa = "";
        patch.englishDirty = false;
        patch.completeError = "";
        this.setData(patch);
      }
    } catch (error) {
      if (this.data.english.trim() === english && (this.completeRequestId || 0) === requestId) {
        this.setData({ completeError: this.friendlyError(error, "自动完善暂时不可用，点此重试或手动填写。") });
      }
    } finally {
      this.setData({ completing: false });
      if (this.completeQueued || (this.data.englishDirty && this.data.english.trim() !== english)) {
        clearTimeout(this.completeTimer);
        this.completeTimer = setTimeout(() => this.completeEnglish(), 300);
      }
    }
  },
  retryComplete() {
    if (!this.data.completing) this.completeEnglish();
  },
  readBase64(path) {
    return new Promise((resolve, reject) => wx.getFileSystemManager().readFile({ filePath: path, encoding: "base64", success: (result) => resolve(result.data), fail: reject }));
  },
  async recognize(kind, path, dataLen) {
    this.setData({ recognizing: true, completeError: "" });
    try {
      const data = await this.readBase64(path);
      const response = await wx.cloud.callFunction({ name: "recognizeInput", data: { kind, data, dataLen } });
      const result = response.result || {};
      if (!result.ok || !result.text) throw new Error(result.message || "没有识别到英文内容");
      this.completeRequestId = (this.completeRequestId || 0) + 1;
      this.setData({ english: result.text.trim(), englishDirty: true });
      await this.completeEnglish();
    } catch (error) {
      this.setData({ completeError: this.friendlyError(error, "识别暂时不可用，请重试或手动输入。") });
    } finally {
      this.setData({ recognizing: false, recording: false });
    }
  },
  voiceInput() {
    if (this.data.recognizing) return;
    if (this.data.recording) return this.recorder && this.recorder.stop();
    if (!this.recorder) {
      this.recorder = wx.getRecorderManager();
      this.recorder.onStop((result) => this.recognize("speech", result.tempFilePath, result.fileSize));
      this.recorder.onError(() => this.setData({ recording: false, completeError: "无法使用麦克风，请在微信设置中允许录音权限。" }));
    }
    this.setData({ recording: true, completeError: "" });
    this.recorder.start({ duration: 30000, sampleRate: 16000, numberOfChannels: 1, encodeBitRate: 48000, format: "mp3" });
  },
  async scanImage() {
    if (this.data.recognizing) return;
    try {
      const result = await wx.chooseMedia({ count: 1, mediaType: ["image"], sourceType: ["camera", "album"], sizeType: ["compressed"] });
      const file = result.tempFiles && result.tempFiles[0];
      if (file) await this.recognize("image", file.tempFilePath, file.size);
    } catch (error) {
      if (!/cancel/i.test(String(error && error.errMsg))) this.setData({ completeError: "无法读取图片，请检查相机或相册权限。" });
    }
  },
  async completeExample() {
    const exampleEn = this.data.exampleEn.trim();
    if (!exampleEn || this.data.exampleZh) return;
    try {
      const exampleZh = await this.translate(exampleEn);
      if (!this.data.exampleZh) this.setData({ exampleZh });
    } catch (error) {
      wx.showModal({ title: "例句翻译失败", content: this.friendlyError(error, "请稍后重试，也可以手动填写。"), showCancel: false });
    }
  },
  async createBook() {
    const name = String(this.data.newBookName || "").trim();
    if (!name) return wx.showToast({ title: "请输入词书名称", icon: "none" });
    if (this.data.books.some((book) => book.name.toLowerCase() === name.toLowerCase())) return wx.showToast({ title: "已有同名词书", icon: "none" });
    try {
      const book = await store.add("books", { name });
      const books = [...this.data.books, book];
      this.setData({ books, bookNames: books.map((item) => item.name), bookIndex: books.length - 1, pendingBookIndex: books.length - 1, bookPickerOpen: false, addingBook: false, newBookName: "" });
    } catch (error) {
      wx.showToast({ title: "创建失败，请重试", icon: "none" });
    }
  },
  async playEnglish() {
    const content = this.data.english.trim();
    if (!content || this.data.speaking) return;
    this.setData({ speaking: true, speechError: "" });
    try {
      await speech.play(content, {
        onError: (audioError) => {
        this.setData({ speaking: false, speechError: this.friendlyError(audioError, "音频播放失败，点喇叭重试。") });
        },
        onPlay: () => this.setData({ speaking: true }),
        onEnded: () => this.setData({ speaking: false }),
      });
    } catch (error) {
      this.setData({ speaking: false, speechError: this.friendlyError(error, "发音暂时不可用，点喇叭重试。") });
    }
  },
  async save() {
    const english = this.data.english.trim();
    const meaning = this.data.meaning.trim();
    if (!english || !meaning) return wx.showToast({ title: "请填写英文和中文意思", icon: "none" });
    const book = this.data.books[this.data.bookIndex];
    const entries = await store.list("entries", "updatedAt");
    const duplicate = entries.find((item) => item.bookId === book._id && item._id !== this.data.id && item.english.trim().toLowerCase() === english.toLowerCase());
    if (duplicate) return wx.showModal({ title: "内容已经存在", content: "同一词书内不能重复添加相同英文。", showCancel: false });
    this.setData({ saving: true });
    const value = {
      bookId: book._id, type: this.data.typeValues[this.data.typeIndex], english, meaning,
      ipa: this.data.ipa.trim(), exampleEn: this.data.exampleEn.trim(), exampleZh: this.data.exampleZh.trim(),
    };
    try {
      if (this.data.id) await store.update("entries", this.data.id, value);
      else await store.add("entries", { ...value, stage: 0, dueAt: new Date() });
      wx.showToast({ title: "已保存" });
      setTimeout(() => wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: "/pages/today/today" }) }), 350);
    } catch (error) {
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
      this.setData({ saving: false });
    }
  },
  onUnload() {
    clearTimeout(this.completeTimer);
    if (this.data.recording && this.recorder) this.recorder.stop();
    speech.stop();
  },
});
