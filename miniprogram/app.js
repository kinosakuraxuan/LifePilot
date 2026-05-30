App({
  globalData: {
    user: {
      nickname: "小王",
      school: "同济大学",
      major: "软件工程",
      grade: "大二",
      studyGoal: 25,
      sportGoal: 3,
      sleepGoal: "23:30",
      entertainmentLimit: 120
    }
  },

  onLaunch() {
    const versionKey = "campusmind_data_version";
    const currentVersion = "2026-05-30-clear-samples";
    if (wx.getStorageSync(versionKey) !== currentVersion) {
      wx.removeStorageSync("lifepilot_courses");
      wx.removeStorageSync("lifepilot_schedules");
      wx.setStorageSync(versionKey, currentVersion);
    }

    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      });
    }
  }
});
