const { KEYS, appendItem, readList, removeItem } = require("../../utils/storage");

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

  parseVoice() {
    const text = this.data.voiceText.trim() || "\u660e\u5929\u4e0b\u5348\u4e09\u70b9\u7ec4\u4f1a\uff0c\u63d0\u524d\u534a\u5c0f\u65f6\u63d0\u9192\u6211";
    this.setData({
      voiceText: text,
      parsedCard: {
        title: text.includes("\u7ec4\u4f1a") ? "\u7ec4\u4f1a" : text,
        type: "\u65e5\u7a0b",
        date: text.includes("\u660e\u5929") ? "\u660e\u5929" : "\u4eca\u5929",
        dateKey: "2026-05-30",
        year: 2026,
        month: 5,
        day: 30,
        startTime: text.includes("\u4e09\u70b9") ? "15:00" : "19:00",
        endTime: text.includes("\u4e09\u70b9") ? "16:00" : "20:00",
        remindAt: "\u63d0\u524d30\u5206\u949f"
      }
    });
  },

  confirmParsed() {
    if (!this.data.parsedCard) return;
    const schedules = appendItem(KEYS.schedules, this.data.parsedCard);
    this.setData({ schedules, parsedCard: null, voiceText: "" });
    wx.showToast({ title: "\u65e5\u7a0b\u5df2\u6dfb\u52a0", icon: "success" });
  },

  deleteSchedule(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "\u5220\u9664\u65e5\u7a0b",
      content: "\u5220\u9664\u540e\u5c06\u4e0d\u4f1a\u51fa\u73b0\u5728\u65e5\u5386\u548c\u641c\u7d22\u7ed3\u679c\u4e2d\u3002",
      confirmText: "\u5220\u9664",
      confirmColor: "#dc2626",
      success: (res) => {
        if (!res.confirm) return;
        const schedules = removeItem(KEYS.schedules, id);
        this.setData({ schedules });
        wx.showToast({ title: "\u5df2\u5220\u9664", icon: "success" });
      }
    });
  }
});

