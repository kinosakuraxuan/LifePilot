const mock = require("../../data/mock");

Page({
  data: {
    sleep: mock.dashboard.sleep,
    trend: [
      { label: "周一", value: 72 },
      { label: "周二", value: 65 },
      { label: "周三", value: 76 },
      { label: "周四", value: 68 },
      { label: "周五", value: 74 }
    ]
  },

  addSleep() {
    wx.showToast({ title: "已记录睡眠", icon: "success" });
  }
});

