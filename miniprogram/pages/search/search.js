const { KEYS, readList, listBoundlessNotes } = require("../../utils/storage");
const { api } = require("../../utils/cloud");
const { normalizeScheduleItem, dedupeByTypeAndSearchIndex } = require("../../utils/scheduleIndex");
const { getSafeAreaLayout } = require("../../utils/safeArea");

function includesKeyword(item, keyword) {
  const target = [
    item.title,
    item.name,
    item.type,
    item.location,
    item.date,
    item.startTime,
    item.endTime,
    item.remindAt,
    item.note,
    item.content
  ].filter(Boolean).join(" ").toLowerCase();
  return target.includes(keyword.toLowerCase());
}

function normalizeNoteItem(item) {
  const searchIndexId = item.cloudId || item._id || item.id || item.clientId || `${item.date}-${item.updatedAt || item.createdAt || ""}`;
  return Object.assign({}, item, {
    id: item.id || searchIndexId,
    title: (item.content || "无边记").slice(0, 28) || "无边记",
    source: "无边记",
    resultType: "note",
    searchIndexId,
    date: item.date || "",
    startTime: "",
    location: ""
  });
}

Page({
  data: {
    keyword: "",
    results: [],
    searched: false,
    loading: false,
    topBarStyle: "",
    leftActionStyle: ""
  },

  onLoad() {
    const layout = getSafeAreaLayout();
    this.setData({
      topBarStyle: layout.topBarStyle,
      leftActionStyle: layout.leftActionStyle
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: "/pages/home/home" });
    }
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onConfirm() {
    this.search();
  },

  async search() {
    const keyword = this.data.keyword.trim();
    if (!keyword) {
      this.setData({ results: [], searched: false });
      return;
    }

    const localSchedules = readList(KEYS.schedules, []);
    const localCourses = readList(KEYS.courses, []);
    const localResults = localSchedules
      .map((item) => normalizeScheduleItem(item, "schedule"))
      .concat(localCourses.map((item) => normalizeScheduleItem(Object.assign({}, item, { title: item.title || item.name }), "course")))
      .filter((item) => includesKeyword(item, keyword));
    const localNotes = listBoundlessNotes()
      .map(normalizeNoteItem)
      .filter((item) => includesKeyword(item, keyword));

    this.setData({ loading: true, searched: true });

    let cloudResults = [];
    try {
      const res = await api.schedule.search(keyword);
      cloudResults = ((res.data && res.data.results) || []).map((item) => normalizeScheduleItem(item, item.type || "schedule"));
    } catch (error) {
      console.warn("scheduleService search fallback to local", error.message);
    }

    const results = dedupeByTypeAndSearchIndex(localResults.concat(cloudResults, localNotes));

    this.setData({ results, loading: false });
  },

  clearKeyword() {
    this.setData({ keyword: "", results: [], searched: false });
  }
});
