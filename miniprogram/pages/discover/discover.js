const { buildDiscoverData } = require("../../utils/activityStats");

Page({
  data: {
    overview: {},
    modules: [],
    days: []
  },

  onLoad() {
    this.refreshStats();
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.refreshStats();
  },

  onPullDownRefresh() {
    this.refreshStats();
    wx.stopPullDownRefresh();
  },

  refreshStats() {
    const data = buildDiscoverData();
    this.setData({
      overview: data.overview,
      modules: data.modules,
      days: data.days
    });
  },

  goModule(e) {
    const module = e.currentTarget.dataset.module;
    if (!module) return;
    wx.navigateTo({ url: `/pages/discoverModule/discoverModule?module=${module}` });
  },

  goPomodoro() {
    wx.preloadSkylineView && wx.preloadSkylineView();
    wx.navigateTo({ url: "/pages/pomodoroSelect/pomodoroSelect" });
  }
});
