const storage = require("../../utils/storage");
const { api } = require("../../utils/cloud");
const { normalizeScheduleItem, isScheduleOnDate } = require("../../utils/scheduleIndex");
const KEYS = storage.KEYS;
const readList = storage.readList;
const writeList = storage.writeList;
const removeItem = storage.removeItem;
const getItemById = storage.getItemById;
const updateItem = storage.updateItem;
const mergeSchedulesToStorage = storage.mergeSchedulesToStorage;
const createBoundlessNote = storage.createBoundlessNote;
const updateBoundlessNote = storage.updateBoundlessNote;
const deleteBoundlessNote = storage.deleteBoundlessNote;
const getBoundlessNoteById = storage.getBoundlessNoteById;
const listBoundlessNotesByDate = storage.listBoundlessNotesByDate;
const todayKey = storage.todayKey;

const LUNAR = [
  "初一", "初二", "初三", "初四", "初五", "初六", "初七",
  "初八", "初九", "初十", "十一", "十二", "十三", "十四",
  "十五", "十六", "十七", "十八", "十九", "二十", "廿一",
  "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八",
  "廿九", "三十", "四月"
];
const LUNAR_BY_MONTH = {
  "2026-5": [
    "十五", "十六", "十七", "十八", "十九", "二十", "廿一",
    "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八",
    "廿九", "三十", "四月", "初二", "初三", "初四", "初五",
    "初六", "初七", "初八", "初九", "初十", "十一", "十二",
    "十三", "十四", "十五"
  ]
};

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function monthMeta(year, month) {
  return {
    first: new Date(year, month - 1, 1).getDay(),
    count: new Date(year, month, 0).getDate()
  };
}

function formatMonth(year, month) {
  return `${year}年${month}月`;
}

function lunarLabel(year, month, day) {
  const exact = LUNAR_BY_MONTH[`${year}-${month}`];
  return exact ? exact[day - 1] : LUNAR[(day - 1) % LUNAR.length];
}

function chromeLayout() {
  const fallback = {
    monthLineStyle: "min-height:78px;padding-top:29px;",
    prevButtonStyle: "left:14px;top:39px;",
    nextButtonStyle: "right:6px;top:39px;"
  };
  try {
    if (!wx.getMenuButtonBoundingClientRect) return fallback;
    const menu = wx.getMenuButtonBoundingClientRect();
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : { windowWidth: 375 };
    if (!menu || !menu.top || !menu.left) return fallback;
    const buttonSize = 44;
    const buttonTop = menu.top + (menu.height - buttonSize) / 2;
    const right = Math.max(6, windowInfo.windowWidth - menu.left -80);
    return {
      monthLineStyle: `min-height:${menu.bottom + 18}px;padding-top:${menu.top}px;`,
      prevButtonStyle: `left:16px;top:${buttonTop}px;`,
      nextButtonStyle: `right:${right}px;top:${buttonTop}px;`
    };
  } catch (error) {
    return fallback;
  }
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return { year, month, day, dateKey: `${year}-${pad(month)}-${pad(day)}` };
}

function dateKeyOf(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function compactTitle(title) {
  const value = title || "未命名";
  return value.length > 4 ? `${value.slice(0, 4)}...` : value;
}

function displayNoteDate(date) {
  const parts = String(date || "").split("-");
  if (parts.length !== 3) return "";
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function itemToEvent(item, occurrenceDateKey) {
  const normalized = normalizeScheduleItem(item, item.type || "schedule");
  const title = normalized.title || "未命名";
  const id = item.clientId || item.id || item._id || item.cloudId || normalized.id || normalized.searchIndexId;
  return {
    id,
    storageId: id,
    searchIndexId: normalized.searchIndexId,
    cloudId: item._id || item.cloudId || "",
    occurrenceDateKey,
    startDateKey: occurrenceDateKey,
    displayStartDateKey: occurrenceDateKey,
    originalStartDateKey: item.startDateKey || item.dateKey || item.date || "",
    title,
    displayTitle: compactTitle(title),
    location: normalized.location || normalized.note || "",
    start: normalized.startTime || "",
    end: normalized.endTime || "",
    open: false
  };
}

function listFromDateResult(res) {
  const data = res && res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.schedules)) return data.schedules;
  return [];
}

function listFromMonthResult(res) {
  const days = (res && res.data && res.data.days) || [];
  const items = [];
  days.forEach((day) => {
    (day.items || day.schedules || []).forEach((item) => {
      items.push(Object.assign({}, item, {
        occurrenceDateKey: day.date,
        dateKey: item.dateKey || item.date || "",
        startDateKey: item.startDateKey || item.dateKey || item.date || ""
      }));
    });
  });
  return items;
}

function eventsFor(year, month, day) {
  const dateKey = dateKeyOf(year, month, day);
  return readList(KEYS.schedules, [])
    .filter((item) => isScheduleOnDate(item, dateKey))
    .map((item) => itemToEvent(item, dateKey));
}

function withSwipeState(events, swipedId) {
  return events.map((item) => Object.assign({}, item, { open: item.id === swipedId }));
}

function notesForDate(date) {
  return listBoundlessNotesByDate(date).map((item) => ({
    id: item.id,
    cloudId: item.cloudId || "",
    date: item.date || date,
    updatedAt: `${item.updatedAt || item.createdAt || ""}`.slice(5, 16).replace("T", " "),
    preview: (item.content || "空白笔记").slice(0, 48),
    content: item.content || ""
  }));
}

function buildMonth(year, month, selectedDay, today, swipedId) {
  const meta = monthMeta(year, month);
  const totalSlots = Math.ceil((meta.first + meta.count) / 7) * 7;
  const days = [];
  for (let slot = 0; slot < totalSlots; slot += 1) {
    const day = slot - meta.first + 1;
    const valid = day >= 1 && day <= meta.count;
    const events = valid ? withSwipeState(eventsFor(year, month, day), swipedId || "") : [];
    days.push({
      id: `${year}-${month}-${slot}`,
      day: valid ? day : 0,
      lunar: valid ? lunarLabel(year, month, day) : "",
      disabled: !valid,
      selected: valid && day === selectedDay,
      isToday: valid && year === today.year && month === today.month && day === today.day,
      events,
      hasCourse: events.length > 0
    });
  }
  return days;
}

const today = getToday();

Page({
  data: {
    year: today.year,
    month: today.month,
    monthTitle: formatMonth(today.year, today.month),
    todayKey: today.dateKey,
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    selectedDay: today.day,
    days: buildMonth(today.year, today.month, today.day, today, ""),
    popupEvents: [],
    selectedDateKey: today.dateKey,
    selectedNotes: [],
    swipedId: "",
    agendaTouchStartX: 0,
    agendaTouchStartY: 0,
    sheetVisible: false,
    sheetOpen: false,
    sheetHeightClass: "three-quarter",
    sheetTab: "schedule",
    sheetTouchStartX: 0,
    sheetTouchStartY: 0,
    sheetSwipeLocked: false,
    sheetDragStartY: 0,
    noteSheetVisible: false,
    noteSheetOpen: false,
    noteSheetMode: "view",
    noteSheetHeightClass: "three-quarter",
    noteSheetDragStartY: 0,
    selectedNote: {},
    editingNoteId: "",
    editingNoteDate: "",
    editingNoteContent: "",
    noteSavedContent: "",
    noteDirty: false,
    monthLineStyle: "min-height:78px;padding-top:29px;",
    prevButtonStyle: "left:14px;top:39px;",
    nextButtonStyle: "right:6px;top:39px;"
  },

  onLoad() {
    this.setData(chromeLayout());
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.refreshCalendar({ skipCloud: true });
    this.loadCloudSchedules(this.data.year, this.data.month, this.data.selectedDay);
  },

  refreshCalendar(options) {
    const skipCloud = !!(options && options.skipCloud);
    const currentToday = getToday();
    const year = this.data.year;
    const month = this.data.month;
    const selectedDay = this.data.selectedDay;
    this.setData({
      todayKey: currentToday.dateKey,
      days: buildMonth(year, month, selectedDay, currentToday, this.data.swipedId),
      popupEvents: withSwipeState(eventsFor(year, month, selectedDay), this.data.swipedId),
      selectedNotes: notesForDate(this.data.selectedDateKey || dateKeyOf(year, month, selectedDay))
    });
    if (!skipCloud) this.loadCloudSchedules(year, month, selectedDay);
  },

  loadCloudSchedules(year, month, selectedDay) {
    const dateKey = dateKeyOf(year, month, selectedDay);
    Promise.all([
      api.schedule.listByDate(dateKey),
      api.schedule.listByMonth(year, month)
    ]).then((results) => {
      const dateRes = results[0];
      const monthRes = results[1];
      const dayItems = {};
      const cloudSchedules = listFromDateResult(dateRes).concat(listFromMonthResult(monthRes));
      if (cloudSchedules.length) {
        mergeSchedulesToStorage(cloudSchedules);
      }
      ((monthRes.data && monthRes.data.days) || []).forEach((day) => {
        const dayNumber = Number(String(day.date).slice(8, 10));
        const items = withSwipeState((day.items || []).map((item) => itemToEvent(item, day.date)), this.data.swipedId);
        if (items.length) {
          dayItems[dayNumber] = items;
        }
      });
      const dateItems = listFromDateResult(dateRes).map((item) => itemToEvent(item, dateKey));
      const updates = {
        days: this.data.days.map((item) => {
          if (!item.day || !dayItems[item.day]) return item;
          return Object.assign({}, item, {
            events: dayItems[item.day],
            hasCourse: dayItems[item.day].length > 0
          });
        })
      };
      if (dateItems.length) {
        updates.popupEvents = withSwipeState(dateItems, this.data.swipedId);
      }
      this.setData(updates, () => {
        if (cloudSchedules.length) this.refreshCalendar({ skipCloud: true });
      });
    }).catch((error) => {
      console.warn("calendar cloud load fallback to local", error.message);
    });
  },

  loadCloudNotes(date) {
    api.note.listByDate(date).then((res) => {
      const cloudNotes = ((res.data && res.data.notes) || []).map((item) => ({
        id: item.clientId || item.id,
        cloudId: item.id,
        date: item.date,
        content: item.content || "",
        attachments: item.assets || [],
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || ""
      }));
      if (!cloudNotes.length) return;
      const local = readList(KEYS.boundlessNotes, []);
      const byId = {};
      local.concat(cloudNotes).forEach((item) => {
        byId[item.id] = item;
      });
      writeList(KEYS.boundlessNotes, Object.keys(byId).map((id) => byId[id]));
      if (this.data.selectedDateKey === date) {
        this.setData({ selectedNotes: notesForDate(date) });
      }
    }).catch((error) => {
      console.warn("noteService listByDate fallback to local", error.message);
    });
  },

  changeMonth(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    let year = this.data.year;
    let month = this.data.month + delta;
    if (month < 1) {
      year -= 1;
      month = 12;
    }
    if (month > 12) {
      year += 1;
      month = 1;
    }
    const selectedDay = year === today.year && month === today.month ? today.day : 1;
    this.setData({ year, month, selectedDay, monthTitle: formatMonth(year, month), swipedId: "" }, () => this.refreshCalendar());
  },

  openDay(e) {
    const day = Number(e.currentTarget.dataset.day);
    if (!day) return;
    const selectedDateKey = dateKeyOf(this.data.year, this.data.month, day);
    this.setData({
      selectedDay: day,
      selectedDateKey,
      selectedNotes: notesForDate(selectedDateKey),
      popupEvents: withSwipeState(eventsFor(this.data.year, this.data.month, day), ""),
      swipedId: "",
      sheetVisible: true,
      sheetTab: "schedule",
      sheetHeightClass: "three-quarter"
    }, () => {
      this.refreshCalendar({ skipCloud: true });
      this.loadCloudSchedules(this.data.year, this.data.month, day);
      this.loadCloudNotes(selectedDateKey);
      setTimeout(() => this.setData({ sheetOpen: true }), 20);
    });
  },

  closeDaySheet() {
    this.setData({ sheetOpen: false });
    setTimeout(() => this.setData({ sheetVisible: false }), 220);
  },

  onSheetDragStart(e) {
    this.setData({ sheetDragStartY: e.touches[0].clientY });
  },

  onSheetDragEnd(e) {
    const deltaY = e.changedTouches[0].clientY - this.data.sheetDragStartY;
    const order = ["full", "three-quarter", "half"];
    let index = order.indexOf(this.data.sheetHeightClass);
    if (deltaY < -35) index = Math.max(0, index - 1);
    if (deltaY > 35) index = Math.min(order.length - 1, index + 1);
    this.setData({ sheetHeightClass: order[index] });
  },

  onSheetSwipeStart(e) {
    if (this.data.sheetSwipeLocked) return;
    this.setData({ sheetTouchStartX: e.touches[0].clientX, sheetTouchStartY: e.touches[0].clientY });
  },

  onSheetSwipeEnd(e) {
    if (this.data.sheetSwipeLocked) {
      this.setData({ sheetSwipeLocked: false });
      return;
    }
    const deltaX = e.changedTouches[0].clientX - this.data.sheetTouchStartX;
    const deltaY = e.changedTouches[0].clientY - this.data.sheetTouchStartY;
    if (Math.abs(deltaX) < 46 || Math.abs(deltaY) > Math.abs(deltaX)) return;
    this.setData({ sheetTab: deltaX < 0 ? "notes" : "schedule", swipedId: "", popupEvents: withSwipeState(this.data.popupEvents, "") });
  },

  onAgendaTouchStart(e) {
    const touch = e.touches[0];
    this.setData({ agendaTouchStartX: touch.clientX, agendaTouchStartY: touch.clientY, sheetSwipeLocked: true });
  },

  onAgendaTouchEnd(e) {
    const id = e.currentTarget.dataset.id;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.data.agendaTouchStartX;
    const deltaY = touch.clientY - this.data.agendaTouchStartY;
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      this.setData({ sheetSwipeLocked: false });
      return;
    }
    if (deltaX < -42) {
      this.setData({ swipedId: id, popupEvents: withSwipeState(this.data.popupEvents, id), sheetSwipeLocked: false }, () => this.refreshCalendar());
      return;
    }
    if (deltaX > 32 || Math.abs(deltaX) < 8) {
      this.setData({ swipedId: "", popupEvents: withSwipeState(this.data.popupEvents, ""), sheetSwipeLocked: false }, () => this.refreshCalendar());
    }
  },

  editSchedule(e) {
    const id = e.currentTarget.dataset.id;
    const occurrenceDateKey = e.currentTarget.dataset.date || this.data.selectedDateKey;
    if (!id) return;
    this.setData({
      swipedId: "",
      popupEvents: withSwipeState(this.data.popupEvents, "")
    }, () => this.refreshCalendar());
    wx.navigateTo({ url: `/pages/scheduleAdd/scheduleAdd?id=${id}&mode=edit&dateKey=${occurrenceDateKey}` });
  },

  deleteSchedule(e) {
    const id = e.currentTarget.dataset.id;
    const occurrenceDateKey = e.currentTarget.dataset.date || this.data.selectedDateKey;
    if (!id) return;
    const schedule = getItemById(KEYS.schedules, id);
    const repeatRule = schedule && schedule.repeatRule;
    const isRepeating = repeatRule && repeatRule.type && repeatRule.type !== "never";
    const closeSwipe = () => this.setData({
      swipedId: "",
      popupEvents: withSwipeState(this.data.popupEvents, "")
    }, () => this.refreshCalendar({ skipCloud: true }));
    const deleteAll = (toastTitle) => {
      removeItem(KEYS.schedules, id);
      api.schedule.delete(id).catch(() => {});
      closeSwipe();
      wx.showToast({ title: toastTitle || "已删除", icon: "success" });
    };
    const deleteOccurrence = () => {
      const excludedDates = Array.isArray(schedule.excludedDates) ? schedule.excludedDates.slice() : [];
      if (!excludedDates.includes(occurrenceDateKey)) excludedDates.push(occurrenceDateKey);
      updateItem(KEYS.schedules, id, { excludedDates });
      api.schedule.update({ id, excludedDates }).catch(() => {});
      closeSwipe();
      wx.showToast({ title: "已删除当天日程", icon: "success" });
    };
    if (isRepeating) {
      wx.showActionSheet({
        itemList: ["仅删除当天", "删除全部重复日程"],
        itemColor: "#ef4444",
        success: (res) => {
          if (res.tapIndex === 0) deleteOccurrence();
          if (res.tapIndex === 1) deleteAll("已删除全部重复日程");
        }
      });
      return;
    }
    wx.showModal({
      title: "删除日程",
      content: "删除后该日期中的此日程将不再显示。",
      confirmText: "删除",
      cancelText: "取消",
      confirmColor: "#ef4444",
      success: (res) => {
        if (!res.confirm) return;
        deleteAll("已删除");
      }
    });
  },

  openNoteEntry(e) {
    const id = e.currentTarget.dataset.id;
    const date = e.currentTarget.dataset.date || this.data.selectedDateKey || todayKey();
    const note = getBoundlessNoteById(id);
    if (!id) return;
    wx.navigateTo({ url: `/pages/boundlessNote/boundlessNote?id=${id}&date=${(note && note.date) || date}` });
  },

  createNoteEntry() {
    wx.navigateTo({ url: `/pages/boundlessNote/boundlessNote?date=${this.data.selectedDateKey || todayKey()}` });
  },

  openNoteSheet(note, mode) {
    if (!note || !note.id) return;
    wx.navigateTo({ url: `/pages/boundlessNote/boundlessNote?id=${note.id}&date=${note.date || this.data.selectedDateKey || todayKey()}` });
  },

  openCreateNoteSheet(date) {
    const targetDate = date || todayKey();
    wx.navigateTo({ url: `/pages/boundlessNote/boundlessNote?date=${targetDate}` });
  },

  closeNoteSheet() {
    if (this.data.noteSheetMode === "edit" && this.data.noteDirty) {
      wx.showModal({
        title: "退出无边记",
        content: "内容尚未保存，是否退出？",
        confirmText: "退出",
        cancelText: "取消",
        confirmColor: "#ef4444",
        success: (res) => {
          if (res.confirm) this.hideNoteSheet();
        }
      });
      return;
    }
    this.hideNoteSheet();
  },

  hideNoteSheet() {
    this.setData({ noteSheetOpen: false });
    setTimeout(() => {
      this.setData({
        noteSheetVisible: false,
        noteSheetMode: "view",
        selectedNote: {},
        editingNoteId: "",
        editingNoteContent: "",
        noteDirty: false
      });
    }, 220);
  },

  onNoteSheetDragStart(e) {
    this.setData({ noteSheetDragStartY: e.touches[0].clientY });
  },

  onNoteSheetDragEnd(e) {
    const deltaY = e.changedTouches[0].clientY - this.data.noteSheetDragStartY;
    const order = ["full", "three-quarter", "half"];
    let index = order.indexOf(this.data.noteSheetHeightClass);
    if (index < 0) index = 1;
    if (deltaY < -35) index = Math.max(0, index - 1);
    if (deltaY > 35) index = Math.min(order.length - 1, index + 1);
    this.setData({ noteSheetHeightClass: order[index] });
  },

  editNoteSheet() {
    const note = this.data.selectedNote || {};
    if (!note.id) return;
    this.hideNoteSheet();
    wx.navigateTo({ url: `/pages/boundlessNote/boundlessNote?id=${note.id}&date=${note.date || this.data.selectedDateKey || todayKey()}` });
  },

  updateNoteSheetContent(e) {
    const value = e.detail.value;
    this.setData({
      editingNoteContent: value,
      noteDirty: value !== this.data.noteSavedContent
    });
  },

  cancelNoteEdit() {
    if (this.data.noteDirty) {
      wx.showModal({
        title: "取消编辑",
        content: "内容尚未保存，是否退出？",
        confirmText: "退出",
        cancelText: "继续编辑",
        confirmColor: "#ef4444",
        success: (res) => {
          if (!res.confirm) return;
          if (this.data.editingNoteId) {
            this.setData({ noteSheetMode: "view", editingNoteContent: this.data.noteSavedContent, noteDirty: false });
          } else {
            this.hideNoteSheet();
          }
        }
      });
      return;
    }
    if (this.data.editingNoteId) {
      this.setData({ noteSheetMode: "view" });
    } else {
      this.hideNoteSheet();
    }
  },

  saveNoteSheet() {
    const content = this.data.editingNoteContent;
    if (!content.trim()) {
      wx.showToast({ title: "笔记为空", icon: "none" });
      return;
    }
    const note = this.data.editingNoteId
      ? updateBoundlessNote(this.data.editingNoteId, { content })
      : createBoundlessNote(this.data.editingNoteDate, { content });
    if (!note) return;
    api.note.create({
      id: note.cloudId || "",
      clientId: note.id,
      date: note.date,
      type: "boundless",
      content: note.content,
      attachments: note.attachments || []
    }).catch(() => {});
    this.setData({
      noteSheetMode: "view",
      selectedNote: note,
      editingNoteId: note.id,
      editingNoteDate: note.date,
      editingNoteContent: note.content || "",
      noteSavedContent: note.content || "",
      noteDirty: false,
      selectedNotes: notesForDate(this.data.selectedDateKey)
    }, () => this.refreshCalendar());
    wx.showToast({ title: "已保存", icon: "success" });
  },

  deleteNoteEntry(e) {
    const id = e.currentTarget.dataset.id;
    const note = getBoundlessNoteById(id) || { id };
    this.confirmDeleteNote(note);
  },

  deleteNoteSheet() {
    const note = this.data.selectedNote || {};
    if (!note.id) return;
    this.confirmDeleteNote(note);
  },

  confirmDeleteNote(note) {
    wx.showModal({
      title: "确认删除",
      content: "这条无边记删除后将无法恢复。",
      confirmText: "删除",
      cancelText: "取消",
      confirmColor: "#ef4444",
      success: (res) => {
        if (!res.confirm) return;
        deleteBoundlessNote(note.id);
        api.note.delete(note.cloudId, { clientId: note.id }).catch(() => {});
        this.setData({
          selectedNotes: notesForDate(this.data.selectedDateKey),
          selectedNote: {}
        }, () => this.refreshCalendar());
        this.hideNoteSheet();
        wx.showToast({ title: "已删除", icon: "success" });
      }
    });
  }
});
