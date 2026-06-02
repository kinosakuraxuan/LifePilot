const { buildModuleDetail } = require("../../utils/activityStats");

Page({
  data: {
    detail: {
      label: "",
      metrics: [],
      chart: { points: [], segments: [] },
      records: []
    },
    module: "study"
  },

  onLoad(query) {
    this.setData({ module: query.module || "study" });
    this.refreshDetail();
  },

  onShow() {
    this.refreshDetail();
  },

  refreshDetail() {
    const detail = buildModuleDetail(this.data.module);
    this.setData({ detail });
  },

  goBack() {
    wx.navigateBack();
  },

  goRecord() {
    wx.navigateTo({ url: `/pages/recordModule/recordModule?module=${this.data.module}` });
  }
});
