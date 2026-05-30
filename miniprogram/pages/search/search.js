const { KEYS, readList } = require("../../utils/storage");

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
    item.note
  ].filter(Boolean).join(" ").toLowerCase();
  return target.includes(keyword.toLowerCase());
}

Page({
  data: {
    keyword: "",
    results: [],
    searched: false,
    loading: false
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
      .map((item) => ({ ...item, source: "\u65e5\u7a0b" }))
      .concat(localCourses.map((item) => ({ ...item, title: item.name, source: "\u8bfe\u7a0b" })))
      .filter((item) => includesKeyword(item, keyword));

    this.setData({ loading: true, searched: true });

    let cloudResults = [];
    if (wx.cloud) {
      try {
        const res = await wx.cloud.callFunction({
          name: "searchSchedules",
          data: { keyword }
        });
        cloudResults = (res.result && res.result.results) || [];
      } catch (error) {
        cloudResults = [];
      }
    }

    const merged = localResults.concat(cloudResults);
    const seen = {};
    const results = merged.filter((item) => {
      const key = item._id || item.id || `${item.title}-${item.startTime}-${item.date}`;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

    this.setData({ results, loading: false });
  },

  clearKeyword() {
    this.setData({ keyword: "", results: [], searched: false });
  }
});

