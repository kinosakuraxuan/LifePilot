const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function sum(list, key) {
  return list.reduce((total, item) => total + Number(item[key] || 0), 0);
}

exports.main = async (event) => {
  const records = event.records || [];
  const sleepAvg = records.length ? sum(records, "sleepHours") / records.length : 0;

  return {
    stats: {
      studyMinutes: sum(records, "studyMinutes"),
      entertainmentMinutes: sum(records, "entertainmentMinutes"),
      exerciseMinutes: sum(records, "exerciseMinutes"),
      sleepAvg: Number(sleepAvg.toFixed(1))
    },
    advice: sleepAvg < 7
      ? "本周平均睡眠偏低，建议减少睡前娱乐时间，并将高强度学习安排在白天。"
      : "本周睡眠较稳定，可以继续保持，并将高效率时段固定为课程复盘和项目推进时间。"
  };
};
