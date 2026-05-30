const mock = require("../../data/mock");

Page({
  data: {
    user: {},
    diaries: mock.diaries,
    aiDiaryAllowed: false,
    profileItems: []
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  onLoad() {
    const user = getApp().globalData.user;
    this.setData({
      user,
      profileItems: [
        { label: "\u5b66\u6821", value: user.school },
        { label: "\u4e13\u4e1a", value: user.major },
        { label: "\u5e74\u7ea7", value: user.grade },
        { label: "\u5b66\u4e60\u76ee\u6807", value: `\u6bcf\u5468 ${user.studyGoal} \u5c0f\u65f6` },
        { label: "\u8fd0\u52a8\u76ee\u6807", value: `\u6bcf\u5468 ${user.sportGoal} \u6b21` },
        { label: "\u7761\u7720\u76ee\u6807", value: user.sleepGoal },
        { label: "\u5a31\u4e50\u4e0a\u9650", value: `\u6bcf\u5929 ${user.entertainmentLimit} \u5206\u949f` }
      ]
    });
  },

  toggleDiaryAuth(e) {
    this.setData({ aiDiaryAllowed: e.detail.value });
  },

  addDiary() {
    const diaries = [{
      id: `${Date.now()}`,
      type: "\u7075\u611f",
      mood: "\u5174\u594b",
      content: "\u65b0\u589e\u4e00\u6761\u7075\u611f\uff1a\u628a\u8bfe\u5802 HCI \u539f\u5219\u5bf9\u5e94\u5230\u6bcf\u4e2a\u9875\u9762\u7684\u4ea4\u4e92\u8bf4\u660e\u3002",
      tags: ["HCI", "\u7b54\u8fa9"],
      date: "\u521a\u521a"
    }, ...this.data.diaries];
    this.setData({ diaries });
    wx.showToast({ title: "\u5df2\u6dfb\u52a0\u7075\u611f", icon: "success" });
  },

  goPage(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.path });
  }
});

