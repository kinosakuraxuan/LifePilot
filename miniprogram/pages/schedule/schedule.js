const { KEYS, appendItem, readList, removeItem } = require("../../utils/storage");
const { api } = require("../../utils/cloud");

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function dateKeyFrom(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fallbackParse(text) {
  const now = new Date();
  const date = new Date(now);
  if (/tomorrow|\u660e\u5929/i.test(text)) date.setDate(now.getDate() + 1);
  const hasAfternoonThree = /3(:00)?\s*pm|15:00|\u4e09\u70b9|3\u70b9/i.test(text);
  const startTime = hasAfternoonThree ? "15:00" : "19:00";
  return {
    title: text.slice(0, 40) || "新日程",
    type: "日程",
    dateKey: dateKeyFrom(date),
    startTime,
    endTime: startTime === "15:00" ? "16:00" : "20:00",
    reminder: /30|half|\u534a\u5c0f\u65f6/i.test(text) ? "提前 30 分钟" : "不提醒"
  };
}

function localizeReminder(value) {
  const text = String(value || "");
  const map = {
    None: "不提醒",
    "At start": "开始时",
    "10 min before": "提前 10 分钟",
    "30 min before": "提前 30 分钟",
    "1 hour before": "提前 1 小时"
  };
  return map[text] || text || "不提醒";
}

function normalizeParsed(parsed, sourceText) {
  const dateKey = parsed.dateKey || dateKeyFrom(new Date());
  const parts = dateKey.split("-").map(Number);
  const clientId = `s${Date.now()}`;
  return {
    id: clientId,
    clientId,
    title: parsed.title || sourceText.slice(0, 40) || "新日程",
    type: parsed.type || "日程",
    date: dateKey,
    dateKey,
    year: parts[0],
    month: parts[1],
    day: parts[2],
    startDateKey: dateKey,
    endDateKey: dateKey,
    startTime: parsed.startTime || "19:00",
    endTime: parsed.endTime || "20:00",
    reminder: localizeReminder(parsed.reminder),
    remindAt: localizeReminder(parsed.reminder),
    status: "todo",
    sourceText
  };
}

Page({
  data: {
    courses: [],
    schedules: [],
    voiceText: "",
    parsedCard: null
  },

  onShow() {
    this.setData({
      courses: readList(KEYS.courses, []),
      schedules: readList(KEYS.schedules, [])
    });
  },

  onVoiceInput(e) {
    this.setData({ voiceText: e.detail.value });
  },

  async parseVoice() {
    const text = this.data.voiceText.trim();
    if (!text) {
      wx.showToast({ title: "请输入日程内容", icon: "none" });
      return;
    }

    try {
      const res = await api.schedule.parse({ text });
      this.setData({
        parsedCard: normalizeParsed(res.data || fallbackParse(text), text)
      });
    } catch (error) {
      console.warn("schedule parse fallback to local", error.message);
      this.setData({
        parsedCard: normalizeParsed(fallbackParse(text), text)
      });
    }
  },

  confirmParsed() {
    if (!this.data.parsedCard) return;
    const schedules = appendItem(KEYS.schedules, this.data.parsedCard);
    api.schedule.create(this.data.parsedCard).catch((error) => {
      console.warn("schedule create pending local only", error.message);
    });
    this.setData({ schedules, parsedCard: null, voiceText: "" });
    wx.showToast({ title: "已添加", icon: "success" });
  },

  deleteSchedule(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "删除日程",
      content: "该日程将从日历和搜索中隐藏。",
      confirmText: "删除",
      confirmColor: "#dc2626",
      success: (res) => {
        if (!res.confirm) return;
        const schedules = removeItem(KEYS.schedules, id);
        api.schedule.delete(id).catch((error) => {
          console.warn("schedule delete pending local only", error.message);
        });
        this.setData({ schedules });
        wx.showToast({ title: "已删除", icon: "success" });
      }
    });
  }
});
