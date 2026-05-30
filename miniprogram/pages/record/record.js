const { KEYS, appendItem, readList } = require("../../utils/storage");
const { formatDate } = require("../../utils/date");
const mock = require("../../data/mock");

Page({
  data: {
    form: {
      studyMinutes: 120,
      entertainmentMinutes: 60,
      exerciseMinutes: 30,
      sleepHours: 7,
      mood: "平稳"
    },
    recent: []
  },

  onShow() {
    this.setData({ recent: readList(KEYS.records, mock.records).slice(0, 5) });
  },

  updateNumber(e) {
    const key = e.currentTarget.dataset.key;
    const value = Number(e.detail.value);
    this.setData({ [`form.${key}`]: value });
  },

  updateMood(e) {
    this.setData({ "form.mood": e.detail.value });
  },

  saveRecord() {
    const recent = appendItem(KEYS.records, {
      date: formatDate(new Date()),
      ...this.data.form
    });
    this.setData({ recent: recent.slice(0, 5) });
    wx.showToast({ title: "记录成功", icon: "success" });
  }
});

