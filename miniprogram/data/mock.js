const courses = [];

const schedules = [];

const records = [
  { id: "r1", date: "\u5468\u4e00", studyMinutes: 210, entertainmentMinutes: 90, exerciseMinutes: 20, sleepHours: 7.2 },
  { id: "r2", date: "\u5468\u4e8c", studyMinutes: 180, entertainmentMinutes: 120, exerciseMinutes: 0, sleepHours: 6.5 },
  { id: "r3", date: "\u5468\u4e09", studyMinutes: 260, entertainmentMinutes: 80, exerciseMinutes: 35, sleepHours: 7.6 },
  { id: "r4", date: "\u5468\u56db", studyMinutes: 150, entertainmentMinutes: 160, exerciseMinutes: 15, sleepHours: 6.8 },
  { id: "r5", date: "\u5468\u4e94", studyMinutes: 230, entertainmentMinutes: 100, exerciseMinutes: 40, sleepHours: 7.4 }
];

const dashboard = {
  sport: {
    todayMinutes: 35,
    weeklyTimes: 2,
    goalTimes: 3,
    calories: 260,
    types: ["\u8dd1\u6b65", "\u62c9\u4f38", "\u7fbd\u6bdb\u7403"],
    advice: "\u672c\u5468\u5df2\u8fd0\u52a8 2 \u6b21\uff0c\u8ddd\u79bb\u76ee\u6807\u8fd8\u5dee 1 \u6b21\u3002"
  },
  study: {
    todayMinutes: 180,
    weeklyHours: 18.5,
    goalHours: 25,
    tasksDone: 6,
    tasksTotal: 9,
    tasks: 3,
    advice: "\u5efa\u8bae\u628a\u5468\u672b\u4e0a\u5348\u56fa\u5b9a\u4e3a\u8bfe\u7a0b\u590d\u76d8\u548c\u9879\u76ee\u63a8\u8fdb\u65f6\u6bb5\u3002"
  },
  entertainment: {
    todayMinutes: 95,
    limitMinutes: 120,
    peak: "22:30 \u540e",
    types: ["\u77ed\u89c6\u9891", "\u6e38\u620f", "\u5f71\u89c6"],
    advice: "\u5a31\u4e50\u65f6\u957f\u4ecd\u5728\u76ee\u6807\u8303\u56f4\u5185\uff0c\u4f46\u6700\u8fd1\u9ad8\u5cf0\u504f\u665a\u3002"
  },
  sleep: {
    lastNightHours: 6.8,
    averageHours: 7.1,
    score: 76,
    bedTime: "00:18",
    wakeTime: "07:25",
    advice: "\u672c\u5468\u5e73\u5747\u7761\u7720\u63a5\u8fd1\u76ee\u6807\uff0c\u4f46\u5165\u7761\u65f6\u95f4\u4e0d\u591f\u7a33\u5b9a\u3002"
  }
};

const diaries = [
  {
    id: "d1",
    type: "\u65e5\u8bb0",
    mood: "\u5e73\u9759",
    content: "\u4eca\u5929\u5b8c\u6210\u4e86 HCI \u9879\u76ee\u7684\u4fe1\u606f\u67b6\u6784\u68b3\u7406\u3002",
    tags: ["\u5b66\u4e60", "\u9879\u76ee"],
    date: "\u4eca\u5929"
  },
  {
    id: "d2",
    type: "\u7075\u611f",
    mood: "\u5174\u594b",
    content: "\u5468\u62a5\u53ef\u4ee5\u52a0\u5165\u4e94\u7ef4\u96f7\u8fbe\u56fe\u3002",
    tags: ["\u4ea7\u54c1", "\u5468\u62a5"],
    date: "\u6628\u5929"
  }
];

module.exports = {
  courses,
  schedules,
  records,
  dashboard,
  diaries,
  music: {
    todayMinutes: 42,
    favorite: "\u8f7b\u97f3\u4e50",
    focusMinutes: 28,
    advice: "\u4eca\u5929\u7684\u97f3\u4e50\u4f7f\u7528\u4ee5\u653e\u677e\u548c\u4e13\u6ce8\u4e3a\u4e3b\u3002"
  }
};

