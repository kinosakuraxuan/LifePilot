const { KEYS, readList } = require("../../utils/storage");
const { buildLocalOverview } = require("../../utils/analytics");
const { api } = require("../../utils/cloud");

function valueOf(card, fallback) {
  return card && card.value ? card.value : fallback;
}

function adviceOf(card, fallback) {
  return card && card.suggestion ? card.suggestion : fallback;
}

function buildQuadrants(overview) {
  const cards = overview.cards || {};
  return [
    {
      title: "学习",
      desc: adviceOf(cards.study, "还没有学习记录，先完成一段专注时间吧。"),
      value: valueOf(cards.study, `${overview.studyMinutes || 0} 分钟`),
      path: "/pages/record/record",
      cls: "q-study"
    },
    {
      title: "运动",
      desc: adviceOf(cards.sport, "还没有运动记录，今天可以从轻量活动开始。"),
      value: valueOf(cards.sport, "0/0"),
      path: "/pages/sport/sport",
      cls: "q-sport"
    },
    {
      title: "娱乐",
      desc: adviceOf(cards.entertainment, "记录娱乐时长，让节奏更清楚。"),
      value: valueOf(cards.entertainment, "0 小时"),
      path: "/pages/entertainment/entertainment",
      cls: "q-entertainment"
    },
    {
      title: "睡眠",
      desc: adviceOf(cards.sleep, "还没有睡眠记录，补充昨晚睡眠即可开始分析。"),
      value: valueOf(cards.sleep, "0 小时"),
      path: "/pages/sleep/sleep",
      cls: "q-sleep"
    }
  ];
}

function localOverview() {
  return buildLocalOverview(
    readList(KEYS.records, []),
    getApp().globalData.user || {},
    {}
  );
}

Page({
  data: {
    quadrants: buildQuadrants({ cards: {} }),
    overview: {},
    loading: false
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  onLoad() {
    this.loadOverview();
  },

  onPullDownRefresh() {
    this.loadOverview().finally(() => wx.stopPullDownRefresh());
  },

  loadOverview() {
    const fallback = localOverview();
    this.setData({
      overview: fallback,
      quadrants: buildQuadrants(fallback),
      loading: true
    });

    return api.record.getOverview()
      .then((res) => {
        const overview = res.data || fallback;
        this.setData({
          overview,
          quadrants: buildQuadrants(overview)
        });
      })
      .catch((error) => {
        console.warn("overview fallback to local", error.message);
      })
      .finally(() => this.setData({ loading: false }));
  },

  goModule(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.path });
  },

  goPomodoro() {
    wx.preloadSkylineView && wx.preloadSkylineView();
    wx.navigateTo({ url: "/pages/pomodoroSelect/pomodoroSelect" });
  },

  goBoundless() {
    wx.navigateTo({ url: "/pages/boundlessNote/boundlessNote" });
  }
});
