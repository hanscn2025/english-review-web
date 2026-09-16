let activeAudio = null;

function writeAudio(path, base64) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().writeFile({ filePath: path, data: base64, encoding: "base64", success: resolve, fail: reject });
  });
}

function fileExists(path) {
  return new Promise((resolve) => {
    wx.getFileSystemManager().access({ path, success: () => resolve(true), fail: () => resolve(false) });
  });
}

async function prepare(text) {
  const response = await wx.cloud.callFunction({ name: "synthesizeSpeech", data: { text } });
  const result = response.result || {};
  if (!result.ok || !result.cacheKey) throw new Error(result.message || "发音生成失败");
  const path = `${wx.env.USER_DATA_PATH}/dayword-${result.cacheKey}.mp3`;
  if (!(await fileExists(path))) {
    if (!result.audioBase64) throw new Error("语音服务未返回音频");
    await writeAudio(path, result.audioBase64);
  }
  return path;
}

async function play(text, handlers = {}) {
  const content = String(text || "").trim();
  if (!content) throw new Error("没有可播放的英文内容");
  const path = await prepare(content);
  if (wx.setInnerAudioOption) {
    await new Promise((resolve) => wx.setInnerAudioOption({ obeyMuteSwitch: false, mixWithOther: true, complete: resolve }));
  }
  if (activeAudio) activeAudio.destroy();
  const audio = wx.createInnerAudioContext();
  activeAudio = audio;
  audio.obeyMuteSwitch = false;
  audio.volume = 1;
  audio.onPlay(() => handlers.onPlay && handlers.onPlay());
  audio.onEnded(() => {
    if (activeAudio === audio) activeAudio = null;
    handlers.onEnded && handlers.onEnded();
    audio.destroy();
  });
  audio.onError((error) => {
    if (activeAudio === audio) activeAudio = null;
    handlers.onError && handlers.onError(error);
    audio.destroy();
  });
  audio.onCanplay(() => audio.play());
  audio.src = path;
  return audio;
}

function stop() {
  if (!activeAudio) return;
  activeAudio.destroy();
  activeAudio = null;
}

module.exports = { play, stop };
