function userMessage(error, fallback = "操作失败，请稍后重试") {
  const message = String(error && (error.message || error.errMsg || error) || "");
  if (/不支持的数据集合|apiVersion|版本|FUNCTION_NOT_FOUND|not found/i.test(message)) return "云端服务正在升级，请稍后重新进入小程序。";
  if (/TIME_LIMIT_EXCEEDED|timed out|timeout|超时/i.test(message)) return "服务响应超时，请稍后重试。";
  if (/permission|not authorized|没有权限|无权操作/i.test(message)) return "当前服务权限异常，请稍后重试。";
  if (/not activated|未开通|尚未开通/i.test(message)) return "相关云服务暂不可用，请稍后重试。";
  if (/network|request:fail|网络/i.test(message)) return "网络连接异常，请检查网络后重试。";
  if (/data exceed|max size|图片仍然过大/i.test(message)) return "图片过大，请裁剪或降低清晰度后重试。";
  if (/没有识别|没有返回|无法读取图片/i.test(message)) return message;
  return fallback;
}

module.exports = { userMessage };
