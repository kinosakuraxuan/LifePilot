const { KEYS, appendItem } = require("../../utils/storage");

function formatDateLabel(dateKey) {
  const parts = dateKey.split("-");
  return `${parts[0]}\u5e74${Number(parts[1])}\u6708${Number(parts[2])}\u65e5`;
}

const repeatOptions = [
  { label: "\u6c38\u4e0d", value: "never" },
  { label: "\u6bcf\u5929", value: "daily" },
  { label: "\u6bcf\u5468", value: "weekly" },
  { label: "\u6bcf2\u5468", value: "biweekly" },
  { label: "\u6bcf\u6708", value: "monthly" },
  { label: "\u6bcf\u5e74", value: "yearly" },
  { label: "\u81ea\u5b9a\u4e49", value: "custom" }
];

const repeatLabels = repeatOptions.reduce((result, item) => {
  result[item.value] = item.label;
  return result;
}, {});

Page({
  data: {
    title: "",
    location: "",
    allDay: false,
    startDateKey: "2026-05-30",
    endDateKey: "2026-05-30",
    startDate: "2026\u5e745\u670830\u65e5",
    startTime: "16:00",
    endDate: "2026\u5e745\u670830\u65e5",
    endTime: "17:00",
    repeatValue: "never",
    repeatLabel: "\u6c38\u4e0d",
    repeatEndMode: "\u4e8e\u65e5\u671f",
    repeatEndDateKey: "2026-06-30",
    repeatEndDate: "2026\u5e746\u670830\u65e5",
    repeatOptions,
    showRepeatSheet: false,
    showCustomRepeat: false,
    customNumbers: Array.from({ length: 30 }, (_, index) => index + 1),
    customUnits: [
      { label: "\u5929", value: "day" },
      { label: "\u5468", value: "week" },
      { label: "\u6708", value: "month" },
      { label: "\u5e74", value: "year" }
    ],
    customPickerValue: [0, 0],
    customNumber: 1,
    customUnit: "day",
    customUnitLabel: "\u5929",
    reminder: "\u65e0",
    reminderOptions: ["\u65e0", "\u5f00\u59cb\u65f6", "\u63d0\u524d10\u5206\u949f", "\u63d0\u524d30\u5206\u949f", "\u63d0\u524d1\u5c0f\u65f6"],
    url: "",
    note: "",
    longText: ""
  },

  noop() {},

  updateField(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [key]: e.detail.value });
  },

  toggleAllDay(e) {
    const allDay = e.detail.value;
    const updates = { allDay };
    if (allDay) {
      updates.endDateKey = this.data.startDateKey;
      updates.endDate = this.data.startDate;
    }
    this.setData(updates);
  },

  onStartDateChange(e) {
    const value = e.detail.value;
    const updates = {
      startDateKey: value,
      startDate: formatDateLabel(value)
    };
    if (this.data.allDay) {
      updates.endDateKey = value;
      updates.endDate = formatDateLabel(value);
    }
    this.setData(updates);
  },

  onEndDateChange(e) {
    if (this.data.allDay) {
      return;
    }
    const value = e.detail.value;
    this.setData({
      endDateKey: value,
      endDate: formatDateLabel(value)
    });
  },

  onStartTimeChange(e) {
    if (!this.data.allDay) {
      this.setData({ startTime: e.detail.value });
    }
  },

  onEndTimeChange(e) {
    if (!this.data.allDay) {
      this.setData({ endTime: e.detail.value });
    }
  },

  onRepeatEndDateChange(e) {
    const value = e.detail.value;
    this.setData({
      repeatEndDateKey: value,
      repeatEndDate: formatDateLabel(value)
    });
  },

  onReminderChange(e) {
    const reminder = this.data.reminderOptions[Number(e.detail.value)] || "\u65e0";
    this.setData({ reminder });
  },

  openRepeatSheet() {
    this.setData({ showRepeatSheet: true, showCustomRepeat: false });
  },

  closeRepeatSheet() {
    this.setData({ showRepeatSheet: false });
  },

  selectRepeat(e) {
    const value = e.currentTarget.dataset.value;
    if (value === "custom") {
      this.setData({ showRepeatSheet: false, showCustomRepeat: true });
      return;
    }
    this.setData({
      repeatValue: value,
      repeatLabel: repeatLabels[value] || "\u6c38\u4e0d",
      showRepeatSheet: false
    });
  },

  backToRepeatSheet() {
    this.setData({ showCustomRepeat: false, showRepeatSheet: true });
  },

  onCustomPickerChange(e) {
    const pickerValue = e.detail.value;
    const numberIndex = pickerValue[0] || 0;
    const unitIndex = pickerValue[1] || 0;
    const unit = this.data.customUnits[unitIndex] || this.data.customUnits[0];
    this.setData({
      customPickerValue: pickerValue,
      customNumber: this.data.customNumbers[numberIndex] || 1,
      customUnit: unit.value,
      customUnitLabel: unit.label
    });
  },

  confirmCustomRepeat() {
    this.setData({
      repeatValue: "custom",
      repeatLabel: `\u6bcf${this.data.customNumber}${this.data.customUnitLabel}`,
      showCustomRepeat: false
    });
  },

  navigateBack() {
    wx.navigateBack();
  },

  saveSchedule() {
    const title = this.data.title.trim();
    if (!title) {
      wx.showToast({ title: "\u8bf7\u8f93\u5165\u6807\u9898", icon: "none" });
      return;
    }

    const [year, month, day] = this.data.startDateKey.split("-").map(Number);
    appendItem(KEYS.schedules, {
      title,
      type: "\u65e5\u7a0b",
      date: this.data.startDate,
      dateKey: this.data.startDateKey,
      year,
      month,
      day,
      startDateKey: this.data.startDateKey,
      endDateKey: this.data.allDay ? this.data.startDateKey : this.data.endDateKey,
      startTime: this.data.allDay ? "" : this.data.startTime,
      endTime: this.data.allDay ? "" : this.data.endTime,
      location: this.data.location.trim(),
      reminder: this.data.reminder,
      remindAt: this.data.reminder,
      repeat: this.data.repeatLabel,
      repeatEndMode: this.data.repeatValue === "never" ? "" : this.data.repeatEndMode,
      repeatEndDateKey: this.data.repeatValue === "never" ? "" : this.data.repeatEndDateKey,
      repeatRule: {
        type: this.data.repeatValue,
        interval: this.data.repeatValue === "custom" ? this.data.customNumber : 1,
        unit: this.data.repeatValue === "custom" ? this.data.customUnit : this.data.repeatValue
      },
      url: this.data.url.trim(),
      note: this.data.note || this.data.longText,
      allDay: this.data.allDay,
      status: "pending"
    });

    wx.showToast({ title: "\u5df2\u6dfb\u52a0", icon: "success" });
    setTimeout(() => {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: "/pages/home/home" });
      }
    }, 450);
  },

  startVoice() {
    wx.showToast({ title: "\u8bed\u97f3\u5165\u53e3\u9884\u7559", icon: "none" });
  }
});
