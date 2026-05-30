const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const text = event.text || "";
  return {
    title: text.includes("组会") ? "组会" : text || "未命名日程",
    date: text.includes("明天") ? "明天" : "今天",
    startTime: text.includes("三点") ? "15:00" : "19:00",
    endTime: text.includes("三点") ? "16:00" : "20:00",
    remindAt: text.includes("半小时") ? "提前 30 分钟" : "准时提醒",
    sourceText: text
  };
};

