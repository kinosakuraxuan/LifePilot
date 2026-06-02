const { api } = require("../../utils/cloud");
const { buildWeeklyReportData, buildFallback } = require("../../utils/weeklyReportData");

function formatMinutes(value) {
  const minutes = Math.max(0, Math.round(Number(value || 0)));
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}min` : `${hours}h`;
  }
  return `${minutes}min`;
}

function metricCards(input) {
  const stats = input.stats || {};
  return [
    { label: "总时长", value: formatMinutes(stats.totalMinutes) },
    { label: "番茄钟", value: formatMinutes(stats.pomodoroMinutes) },
    { label: "日程", value: `${stats.scheduleCount || 0}` },
    { label: "无边记", value: `${stats.noteCount || 0}` }
  ];
}

function moduleCards(input) {
  const stats = input.stats || {};
  return [
    { label: "学习", value: formatMinutes(stats.studyMinutes), cls: "study" },
    { label: "运动", value: formatMinutes(stats.sportMinutes), cls: "sport" },
    { label: "睡眠", value: `${stats.sleepAverageHours || 0}h`, cls: "sleep" },
    { label: "娱乐", value: formatMinutes(stats.entertainmentMinutes), cls: "entertainment" },
    { label: "日程", value: `${stats.scheduleCount || 0} 项`, cls: "schedule" },
    { label: "无边记", value: `${stats.noteCount || 0} 条`, cls: "note" },
    { label: "番茄钟", value: `${stats.pomodoroCount || 0} 次`, cls: "focus" }
  ];
}

function buildShareText(input, report) {
  const stats = input.stats || {};
  return [
    `本周周报 ${input.weekStart} - ${input.weekEnd}`,
    `总时长：${formatMinutes(stats.totalMinutes)}`,
    `日程：${stats.scheduleCount || 0} 个，无边记：${stats.noteCount || 0} 条`,
    `番茄钟：${formatMinutes(stats.pomodoroMinutes)}`,
    report.shareText || report.summary || ""
  ].filter(Boolean).join("\n");
}

Page({
  data: {
    rangeText: "",
    aiInput: {},
    report: {},
    metricCards: [],
    moduleCards: [],
    daily: [],
    generating: false,
    shareText: "",
    decoImage: "/assets/report/weekly-report-deco.svg"
  },

  onShow() {
    this.loadLocalReport();
  },

  loadLocalReport() {
    const data = buildWeeklyReportData(new Date());
    const report = data.fallback || buildFallback(data.aiInput);
    this.setData({
      rangeText: data.range.rangeText,
      aiInput: data.aiInput,
      report,
      metricCards: metricCards(data.aiInput),
      moduleCards: moduleCards(data.aiInput),
      daily: data.aiInput.daily,
      shareText: buildShareText(data.aiInput, report)
    });
  },

  generateAIReport() {
    if (this.data.generating) return;
    this.setData({ generating: true });
    wx.showLoading({ title: "正在生成周报..." });
    api.report.generateWeeklyReport(this.data.aiInput).then((res) => {
      const report = (res && res.data) || {};
      if (report.success === false) {
        throw new Error(report.message || "generate failed");
      }
      this.setData({
        report,
        shareText: buildShareText(this.data.aiInput, report)
      });
      wx.showToast({ title: "已生成", icon: "success" });
    }).catch((error) => {
      console.warn("AI weekly report fallback", error.message);
      wx.showToast({ title: "周报生成失败，请稍后重试", icon: "none" });
    }).finally(() => {
      wx.hideLoading();
      this.setData({ generating: false });
    });
  },

  generateShareText() {
    if (this.data.shareText) {
      wx.showToast({ title: "分享文案已生成", icon: "none" });
      return;
    }
    const text = buildShareText(this.data.aiInput, this.data.report || {});
    this.setData({ shareText: text });
  },

  copyShareText() {
    const text = this.data.shareText || buildShareText(this.data.aiInput, this.data.report || {});
    wx.setClipboardData({
      data: text,
      success() {
        wx.showToast({ title: "已复制", icon: "success" });
      }
    });
  }
});
