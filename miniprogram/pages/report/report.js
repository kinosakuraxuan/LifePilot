const { KEYS, readList } = require("../../utils/storage");
const { api } = require("../../utils/cloud");

function sum(list, key) {
  return list.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function percent(value, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

function buildLocalReport(records) {
  const app = getApp();
  const user = app.globalData.user || {};
  const study = sum(records, "studyMinutes");
  const entertainment = sum(records, "entertainmentMinutes");
  const sport = sum(records, "exerciseMinutes") || sum(records, "sportMinutes");
  const sleepAvg = records.length ? sum(records, "sleepHours") / records.length : 0;
  const studyGoal = Number(user.studyGoal || 25) * 60;
  const sportGoal = Number(user.sportGoal || 3) * 30;
  const sleepGoal = Number(user.sleepGoal || 8);
  const entertainmentLimit = Number(user.entertainmentLimit || 600);
  const scores = {
    study: percent(study, studyGoal),
    health: Math.round((percent(sport, sportGoal) + percent(sleepAvg, sleepGoal)) / 2),
    discipline: Math.max(0, 100 - Math.round(Math.max(0, entertainment - entertainmentLimit) / 6)),
    balance: records.length ? 70 : 0,
    growth: study > 0 ? 80 : 0
  };
  return {
    stats: {
      studyMinutes: study,
      entertainmentMinutes: entertainment,
      exerciseMinutes: sport,
      sportMinutes: sport,
      sleepAvg: Number(sleepAvg.toFixed(1))
    },
    scores,
    advice: records.length
      ? "继续保持每日记录，一次调整一个习惯。"
      : "本周添加记录后，会生成更有参考价值的周报。"
  };
}

function toPageData(records, report) {
  const stats = report.stats || {};
  const scores = report.scores || {};
  const maxStudy = Math.max.apply(null, records.map((item) => item.studyMinutes || 0).concat([1]));
  const totalLife = Math.max(
    Number(stats.studyMinutes || 0) + Number(stats.entertainmentMinutes || 0) + Number(stats.sportMinutes || stats.exerciseMinutes || 0),
    1
  );
  return {
    records,
    stats: {
      studyHours: (Number(stats.studyMinutes || 0) / 60).toFixed(1),
      entertainmentHours: (Number(stats.entertainmentMinutes || 0) / 60).toFixed(1),
      exerciseMinutes: Number(stats.sportMinutes || stats.exerciseMinutes || 0),
      sleepAvg: stats.sleepAvg || 0
    },
    studyBars: records.map((item) => ({
      label: item.date,
      width: Math.max(8, Math.round(((item.studyMinutes || 0) / maxStudy) * 100))
    })),
    sleepLine: records.map((item) => ({
      label: item.date,
      height: Math.max(18, Math.round(((item.sleepHours || 0) / 8) * 100))
    })),
    balanceDonut: [
      { label: "学习", value: Math.round((Number(stats.studyMinutes || 0) / totalLife) * 100), cls: "blue" },
      { label: "娱乐", value: Math.round((Number(stats.entertainmentMinutes || 0) / totalLife) * 100), cls: "orange" },
      { label: "运动", value: Math.round((Number(stats.sportMinutes || stats.exerciseMinutes || 0) / totalLife) * 100), cls: "green" }
    ],
    radar: [
      { label: "学习", value: scores.study || 0, cls: "r1" },
      { label: "健康", value: scores.health || 0, cls: "r2" },
      { label: "自律", value: scores.discipline || 0, cls: "r3" },
      { label: "平衡", value: scores.balance || 0, cls: "r4" },
      { label: "成长", value: scores.growth || 0, cls: "r5" }
    ],
    advice: report.advice || report.aiSummary || "添加记录后会生成周报。"
  };
}

Page({
  data: {
    records: [],
    stats: {},
    studyBars: [],
    sleepLine: [],
    balanceDonut: [],
    radar: [],
    advice: "",
    diaryAuth: false
  },

  onShow() {
    this.generateReport();
  },

  generateReport() {
    const records = readList(KEYS.records, []).slice(0, 7);
    const fallback = buildLocalReport(records);
    this.setData(toPageData(records, fallback));

    api.record.getWeeklyReport({
      records,
      allowDiaryAI: this.data.diaryAuth
    }).then((res) => {
      this.setData(toPageData(records, res.data || fallback));
    }).catch((error) => {
      console.warn("weekly report fallback to local", error.message);
    });
  },

  toggleDiaryAuth(e) {
    this.setData({ diaryAuth: e.detail.value }, () => this.generateReport());
  }
});
