const { KEYS, listBoundlessNotes } = require("../../utils/storage");
const { api } = require("../../utils/cloud");

const LOGIN_STATUS_KEY = "lifepilot_login_status";

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

Page({
  data: {
    user: {},
    noteCount: 0,
    latestPreview: "暂无无边记",
    aiDiaryAllowed: false,
    profileItems: [],
    isLoggedIn: false,
    editMode: false,
    saving: false,
    formSchool: "",
    formMajor: "",
    formGrade: "",
    formStudyGoal: "",
    formSportGoal: "",
    formSleepGoal: "",
    formEntertainmentLimit: ""
  },

  onLoad() {
    this.refreshUser();
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.refreshUser();
  },

  refreshUser() {
    const app = getApp();
    const user = app.globalData.user || {};
    const loginStatus = wx.getStorageSync(LOGIN_STATUS_KEY);
    const isLoggedIn = !!(app.globalData.isLoggedIn || (loginStatus && loginStatus.openid));
    const profileCompleted = user.profileCompleted === true || (loginStatus && loginStatus.profileCompleted === true);
    const settings = wx.getStorageSync(KEYS.userSettings) || {};
    const notes = listBoundlessNotes();
    const latest = notes[0] || {};
    const items = [];

    if (user.school) items.push({ label: "学校", value: user.school });
    if (user.major) items.push({ label: "专业", value: user.major });
    if (user.grade) items.push({ label: "年级", value: user.grade });
    if (hasValue(user.studyGoal)) items.push({ label: "学习目标", value: `${user.studyGoal} 小时/周` });
    if (hasValue(user.sportGoal)) items.push({ label: "运动目标", value: `${user.sportGoal} 次/周` });
    if (user.sleepGoal) items.push({ label: "睡眠目标", value: user.sleepGoal });
    if (hasValue(user.entertainmentLimit)) items.push({ label: "娱乐上限", value: `${user.entertainmentLimit} 分钟/天` });

    this.setData({
      user,
      isLoggedIn,
      editMode: !profileCompleted,
      aiDiaryAllowed: !!settings.allowDiaryAI,
      profileItems: items,
      noteCount: notes.length,
      latestPreview: latest.content ? latest.content.slice(0, 32) : "暂无无边记",
      formSchool: user.school || "",
      formMajor: user.major || "",
      formGrade: user.grade || "",
      formStudyGoal: hasValue(user.studyGoal) ? String(user.studyGoal) : "",
      formSportGoal: hasValue(user.sportGoal) ? String(user.sportGoal) : "",
      formSleepGoal: user.sleepGoal || "",
      formEntertainmentLimit: hasValue(user.entertainmentLimit) ? String(user.entertainmentLimit) : ""
    });
  },

  refreshNotes() {
    this.refreshUser();
  },

  onSchoolInput(e) { this.setData({ formSchool: e.detail.value }); },
  onMajorInput(e) { this.setData({ formMajor: e.detail.value }); },
  onGradeInput(e) { this.setData({ formGrade: e.detail.value }); },
  onStudyGoalInput(e) { this.setData({ formStudyGoal: e.detail.value }); },
  onSportGoalInput(e) { this.setData({ formSportGoal: e.detail.value }); },
  onSleepGoalInput(e) { this.setData({ formSleepGoal: e.detail.value }); },
  onEntertainmentLimitInput(e) { this.setData({ formEntertainmentLimit: e.detail.value }); },

  enableEdit() {
    this.setData({ editMode: true });
  },

  async handleSaveProfile() {
    if (this.data.saving) return;
    this.setData({ saving: true });

    try {
      const result = await api.user.updateProfile({
        school: this.data.formSchool.trim(),
        major: this.data.formMajor.trim(),
        grade: this.data.formGrade.trim(),
        studyGoal: this.data.formStudyGoal.trim(),
        sportGoal: this.data.formSportGoal.trim(),
        sleepGoal: this.data.formSleepGoal.trim(),
        entertainmentLimit: this.data.formEntertainmentLimit.trim(),
        profileCompleted: true
      });

      if (result.code !== 0 || !result.data || !result.data.user) {
        throw new Error(result.message || "保存失败");
      }

      const app = getApp();
      app.syncUserData(result.data.user, false);
      app.globalData.isNewUser = false;

      const loginStatus = wx.getStorageSync(LOGIN_STATUS_KEY) || {};
      loginStatus.isNewUser = false;
      loginStatus.profileCompleted = true;
      wx.setStorageSync(LOGIN_STATUS_KEY, loginStatus);

      wx.showToast({ title: "已保存", icon: "success", duration: 1200 });
      setTimeout(() => this.refreshUser(), 250);
    } catch (error) {
      console.error("saveProfile failed", error);
      wx.showToast({ title: "保存失败，请稍后重试", icon: "none", duration: 2000 });
    } finally {
      this.setData({ saving: false });
    }
  },

  toggleDiaryAuth(e) {
    const allowDiaryAI = e.detail.value;
    const settings = wx.getStorageSync(KEYS.userSettings) || {};
    wx.setStorageSync(KEYS.userSettings, Object.assign({}, settings, { allowDiaryAI }));
    this.setData({ aiDiaryAllowed: allowDiaryAI });
  },

  openNotes() {
    wx.navigateTo({ url: "/pages/noteList/noteList" });
  },

  goPage(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.path });
  },

  handleLogout() {
    wx.showModal({
      title: "退出登录",
      content: "只会清理本机登录态，不会删除云端历史数据。",
      confirmText: "退出",
      cancelText: "取消",
      confirmColor: "#ef4444",
      success: (res) => {
        if (!res.confirm) return;

        wx.removeStorageSync(LOGIN_STATUS_KEY);

        const app = getApp();
        app.globalData.isLoggedIn = false;
        app.globalData.isNewUser = false;
        Object.assign(app.globalData.user, {
          openid: "",
          userId: "",
          nickname: "",
          avatarUrl: "",
          school: "",
          major: "",
          grade: "",
          studyGoal: null,
          sportGoal: null,
          sleepGoal: null,
          entertainmentLimit: null,
          profileCompleted: false
        });

        wx.showToast({ title: "已退出登录", icon: "none", duration: 1200 });
        setTimeout(() => {
          wx.reLaunch({ url: "/pages/login/login" });
        }, 500);
      }
    });
  }
});
