const { KEYS, readList, removeItem } = require("../../utils/storage");

const LUNAR = [
  "\u521d\u4e00", "\u521d\u4e8c", "\u521d\u4e09", "\u521d\u56db", "\u521d\u4e94", "\u521d\u516d", "\u521d\u4e03",
  "\u521d\u516b", "\u521d\u4e5d", "\u521d\u5341", "\u5341\u4e00", "\u5341\u4e8c", "\u5341\u4e09", "\u5341\u56db",
  "\u5341\u4e94", "\u5341\u516d", "\u5341\u4e03", "\u5341\u516b", "\u5341\u4e5d", "\u4e8c\u5341", "\u5eff\u4e00",
  "\u5eff\u4e8c", "\u5eff\u4e09", "\u5eff\u56db", "\u5eff\u4e94", "\u5eff\u516d", "\u5eff\u4e03", "\u5eff\u516b",
  "\u5eff\u4e5d", "\u4e09\u5341", "\u56db\u6708"
];

function monthMeta(year, month) {
  const first = new Date(year, month - 1, 1).getDay();
  const count = new Date(year, month, 0).getDate();
  return { first, count };
}

function formatMonth(year, month) {
  return `${year} \u5e74 ${month} \u6708`;
}

function itemToEvent(item) {
  return {
    id: item.id,
    title: item.title || item.name || "\u672a\u547d\u540d\u4e8b\u9879",
    location: item.location || item.note || "",
    start: item.startTime || "",
    end: item.endTime || "",
    color: "yellow"
  };
}

function eventsFor(year, month, day) {
  return readList(KEYS.schedules, [])
    .filter((item) => Number(item.year) === year && Number(item.month) === month && Number(item.day) === day)
    .map(itemToEvent);
}

function buildMonth(year, month, selectedDay) {
  const { first, count } = monthMeta(year, month);
  const totalSlots = Math.ceil((first + count) / 7) * 7;
  const days = [];
  for (let slot = 0; slot < totalSlots; slot += 1) {
    const day = slot - first + 1;
    const valid = day >= 1 && day <= count;
    const events = valid ? eventsFor(year, month, day) : [];
    days.push({
      id: `${year}-${month}-${slot}`,
      day: valid ? day : 0,
      lunar: valid ? LUNAR[(day - 1) % LUNAR.length] : "",
      disabled: !valid,
      selected: valid && day === selectedDay,
      isToday: year === 2026 && month === 5 && day === 30,
      events,
      hasCourse: events.length > 0
    });
  }
  return days;
}

Page({
  data: {
    year: 2026,
    month: 5,
    monthTitle: "2026 \u5e74 5 \u6708",
    weekdays: ["\u5468\u65e5", "\u5468\u4e00", "\u5468\u4e8c", "\u5468\u4e09", "\u5468\u56db", "\u5468\u4e94", "\u5468\u516d"],
    selectedDay: 30,
    days: buildMonth(2026, 5, 30),
    showPopup: false,
    popupDay: 30,
    popupLunar: "\u5341\u56db",
    popupEvents: [],
    popupLevel: "three-quarter",
    touchStartY: 0,
    agendaTouchStartX: 0,
    agendaTouchStartY: 0,
    swipedId: "",
    diaryText: "",
    inspirations: []
  },

  refreshCalendar() {
    const { year, month, selectedDay } = this.data;
    this.setData({
      days: buildMonth(year, month, selectedDay),
      popupEvents: eventsFor(year, month, selectedDay)
    });
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.refreshCalendar();
  },

  changeMonth(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    let { year, month } = this.data;
    month += delta;
    if (month < 1) {
      year -= 1;
      month = 12;
    }
    if (month > 12) {
      year += 1;
      month = 1;
    }
    const selectedDay = year === 2026 && month === 5 ? 30 : 1;
    this.setData({
      year,
      month,
      selectedDay,
      monthTitle: formatMonth(year, month)
    }, () => this.refreshCalendar());
  },

  openDay(e) {
    const day = Number(e.currentTarget.dataset.day);
    if (!day) return;
    this.setData({
      selectedDay: day,
      showPopup: true,
      popupLevel: "three-quarter",
      swipedId: "",
      popupDay: day,
      popupLunar: LUNAR[(day - 1) % LUNAR.length] || ""
    }, () => this.refreshCalendar());
  },

  closePopup() {
    this.setData({ showPopup: false });
  },

  onHandleStart(e) {
    this.setData({ touchStartY: e.touches[0].clientY });
  },

  onHandleEnd(e) {
    const endY = e.changedTouches[0].clientY;
    const delta = endY - this.data.touchStartY;
    const levels = ["half", "three-quarter", "full"];
    let index = levels.indexOf(this.data.popupLevel);
    if (delta < -36) index = Math.min(index + 1, levels.length - 1);
    if (delta > 36) index = Math.max(index - 1, 0);
    this.setData({ popupLevel: levels[index] });
  },

  updateDiary(e) {
    this.setData({ diaryText: e.detail.value });
  },

  onAgendaTouchStart(e) {
    const touch = e.touches[0];
    this.setData({
      agendaTouchStartX: touch.clientX,
      agendaTouchStartY: touch.clientY
    });
  },

  onAgendaTouchEnd(e) {
    const id = e.currentTarget.dataset.id;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.data.agendaTouchStartX;
    const deltaY = touch.clientY - this.data.agendaTouchStartY;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    if (deltaX < -42) {
      this.setData({ swipedId: id });
      return;
    }
    if (deltaX > 32 || Math.abs(deltaX) < 8) {
      this.setData({ swipedId: "" });
    }
  },

  saveDiary() {
    wx.showToast({ title: "\u65e5\u8bb0\u5df2\u4fdd\u5b58", icon: "success" });
  },

  deleteSchedule(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: "\u5220\u9664\u65e5\u7a0b",
      content: "\u5220\u9664\u540e\u5c06\u4e0d\u4f1a\u51fa\u73b0\u5728\u65e5\u5386\u548c\u641c\u7d22\u7ed3\u679c\u4e2d\u3002",
      confirmText: "\u5220\u9664",
      confirmColor: "#ef4444",
      success: (res) => {
        if (!res.confirm) return;
        removeItem(KEYS.schedules, id);
        this.setData({ swipedId: "" }, () => this.refreshCalendar());
        wx.showToast({ title: "\u5df2\u5220\u9664", icon: "success" });
      }
    });
  },

  noop() {}
});
