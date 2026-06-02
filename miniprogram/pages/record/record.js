const { KEYS, readList } = require("../../utils/storage");
const { formatDate } = require("../../utils/date");

const modules = [
  { key: "study", label: "学习", desc: "课程、作业、阅读与复习", cls: "study" },
  { key: "sleep", label: "睡眠", desc: "睡眠时长与休息状态", cls: "sleep" },
  { key: "sport", label: "运动", desc: "跑步、球类和日常活动", cls: "sport" },
  { key: "entertainment", label: "娱乐", desc: "音乐、游戏、电影和放松", cls: "entertainment" }
];

function recordTitle(item) {
  if (item.title) return item.title;
  if (item.source === "pomodoro") return "番茄钟";
  return item.mood || "生活记录";
}

function recordMeta(item) {
  if (item.module || item.type) {
    const value = item.module || item.type;
    const label = modules.find((module) => module.key === value);
    return label ? label.label : value;
  }
  return [
    item.studyMinutes ? `学习 ${item.studyMinutes} 分钟` : "",
    item.exerciseMinutes || item.sportMinutes ? `运动 ${item.exerciseMinutes || item.sportMinutes} 分钟` : "",
    item.entertainmentMinutes ? `娱乐 ${item.entertainmentMinutes} 分钟` : "",
    item.sleepHours ? `睡眠 ${item.sleepHours} 小时` : ""
  ].filter(Boolean).join(" · ");
}

Page({
  data: {
    modules,
    today: formatDate(new Date()),
    recent: []
  },

  onShow() {
    this.refreshRecent();
  },

  refreshRecent() {
    const recent = readList(KEYS.records, []).slice(0, 8).map((item) => Object.assign({}, item, {
      displayTitle: recordTitle(item),
      displayMeta: recordMeta(item),
      displayDate: item.date || item.dateKey || String(item.createdAt || "").slice(0, 10)
    }));
    this.setData({ recent });
  },

  openModule(e) {
    const module = e.currentTarget.dataset.module;
    wx.navigateTo({ url: `/pages/recordModule/recordModule?module=${module}` });
  }
});
