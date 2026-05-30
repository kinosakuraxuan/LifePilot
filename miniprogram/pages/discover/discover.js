const mock = require("../../data/mock");

Page({
  data: {
    quadrants: []
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  onLoad() {
    const d = mock.dashboard;
    this.setData({
      quadrants: [
        {
          title: "\u5a31\u4e50",
          desc: "\u65f6\u957f\u4e0e\u9ad8\u53d1\u65f6\u6bb5",
          value: `${d.entertainment.todayMinutes}m`,
          path: "/pages/entertainment/entertainment",
          cls: "q-entertainment"
        },
        {
          title: "\u7761\u7720",
          desc: "\u8d28\u91cf\u8bc4\u5206\u4e0e\u4f5c\u606f",
          value: `${d.sleep.score}`,
          path: "/pages/sleep/sleep",
          cls: "q-sleep"
        },
        {
          title: "\u8fd0\u52a8",
          desc: "\u76ee\u6807\u4e0e\u7c7b\u578b\u8bb0\u5f55",
          value: `${d.sport.weeklyTimes}/${d.sport.goalTimes}`,
          path: "/pages/sport/sport",
          cls: "q-sport"
        },
        {
          title: "\u97f3\u4e50",
          desc: "\u653e\u677e\u4e0e\u4e13\u6ce8\u8bb0\u5f55",
          value: `${mock.music.todayMinutes}m`,
          path: "/pages/record/record",
          cls: "q-music"
        }
      ]
    });
  },

  goModule(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.path });
  },

  goReport() {
    wx.navigateTo({ url: "/pages/report/report" });
  }
});

