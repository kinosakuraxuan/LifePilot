const mock = require("../../data/mock");

Page({
  data: {
    entertainment: mock.dashboard.entertainment,
    distribution: [
      { label: "短视频", value: 45 },
      { label: "游戏", value: 30 },
      { label: "影视", value: 25 }
    ]
  },

  addEntertainment() {
    wx.showToast({ title: "已记录娱乐", icon: "success" });
  }
});

