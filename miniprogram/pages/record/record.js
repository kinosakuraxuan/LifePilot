const { KEYS, appendItem, readList } = require("../../utils/storage");
const { formatDate } = require("../../utils/date");
const { api } = require("../../utils/cloud");

Page({
  data: {
    form: {
      studyMinutes: 0,
      entertainmentMinutes: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      mood: ""
    },
    recent: []
  },

  onShow() {
    this.setData({ recent: readList(KEYS.records, []).slice(0, 5) });
  },

  updateNumber(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: Number(e.detail.value) });
  },

  updateMood(e) {
    this.setData({ "form.mood": e.detail.value });
  },

  saveRecord() {
    const record = Object.assign({ date: formatDate(new Date()) }, this.data.form);
    const recent = appendItem(KEYS.records, record);
    this.setData({ recent: recent.slice(0, 5) });
    api.record.create(record).catch((error) => {
      console.warn("record create pending local only", error.message);
    });
    wx.showToast({ title: "记录已保存", icon: "success" });
  }
});
