const mock = require("../../data/mock");

Page({
  data: {
    sport: mock.dashboard.sport,
    trend: [
      { label: "周一", value: 25 },
      { label: "周二", value: 0 },
      { label: "周三", value: 35 },
      { label: "周四", value: 15 },
      { label: "周五", value: 20 }
    ]
  },

  addSport() {
    wx.showToast({ title: "已记录运动", icon: "success" });
  }
});

