const { KEYS, readList } = require("../../utils/storage");
const mock = require("../../data/mock");

function sum(list, key) {
  return list.reduce((total, item) => total + Number(item[key] || 0), 0);
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
    const records = readList(KEYS.records, mock.records).slice(0, 7);
    const study = sum(records, "studyMinutes");
    const entertainment = sum(records, "entertainmentMinutes");
    const exercise = sum(records, "exerciseMinutes");
    const sleepAvg = records.length ? (sum(records, "sleepHours") / records.length).toFixed(1) : 0;
    const maxStudy = Math.max(...records.map((item) => item.studyMinutes || 0), 1);
    const totalLife = Math.max(study + entertainment + exercise, 1);

    this.setData({
      records,
      stats: {
        studyHours: (study / 60).toFixed(1),
        entertainmentHours: (entertainment / 60).toFixed(1),
        exerciseMinutes: exercise,
        sleepAvg
      },
      studyBars: records.map((item) => ({
        label: item.date,
        width: Math.max(8, Math.round(((item.studyMinutes || 0) / maxStudy) * 100))
      })),
      sleepLine: records.map((item) => ({
        label: item.date,
        height: Math.max(18, Math.round(((item.sleepHours || 0) / 9) * 100))
      })),
      balanceDonut: [
        { label: "学习", value: Math.round((study / totalLife) * 100), cls: "blue" },
        { label: "娱乐", value: Math.round((entertainment / totalLife) * 100), cls: "orange" },
        { label: "运动", value: Math.round((exercise / totalLife) * 100), cls: "green" }
      ],
      radar: [
        { label: "学习力", value: 82, cls: "r1" },
        { label: "健康力", value: 68, cls: "r2" },
        { label: "自律力", value: 75, cls: "r3" },
        { label: "平衡力", value: 61, cls: "r4" },
        { label: "成长力", value: 88, cls: "r5" }
      ],
      advice: Number(sleepAvg) < 7
        ? "本周平均睡眠低于 7 小时，建议把高强度学习安排到白天，并在睡前减少娱乐时长。"
        : "本周睡眠较稳定，可以继续保持。学习峰值明显，建议把高效率时段固定为课程复盘和项目推进时间。"
    });
  },

  toggleDiaryAuth(e) {
    this.setData({ diaryAuth: e.detail.value });
  }
});

