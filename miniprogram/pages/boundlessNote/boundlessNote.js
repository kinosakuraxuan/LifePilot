const storage = require("../../utils/storage");
const { api } = require("../../utils/cloud");

const {
  KEYS,
  readList,
  removeItem,
  createBoundlessNote,
  updateBoundlessNote,
  deleteBoundlessNote,
  getBoundlessNoteById,
  getBoundlessDraftByDate,
  todayKey
} = storage;

function normalizeDate(value) {
  if (!value) return todayKey();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
    const parts = value.split("-");
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  return todayKey();
}

function displayDate(dateKey) {
  const target = normalizeDate(dateKey);
  const parts = target.split("-");
  if (target === todayKey()) return "今天";
  return `${Number(parts[0])}.${Number(parts[1])}.${Number(parts[2])}`;
}

function findLegacyNote(id) {
  return readList(KEYS.diaries, []).find((item) => String(item.id || "") === String(id || "")) || null;
}

function normalizeAttachment(item) {
  return Object.assign({
    id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "",
    label: "",
    value: ""
  }, item || {});
}

function refreshPreviousPage() {
  const pages = getCurrentPages ? getCurrentPages() : [];
  const prevPage = pages[pages.length - 2];
  if (!prevPage) return;
  if (typeof prevPage.refreshCalendar === "function") prevPage.refreshCalendar({ skipCloud: true });
  if (typeof prevPage.refreshNotes === "function") prevPage.refreshNotes({ skipCloud: true });
  if (typeof prevPage.loadNotes === "function") prevPage.loadNotes({ skipCloud: true });
  if (typeof prevPage.refreshUser === "function") prevPage.refreshUser();
}

Page({
  data: {
    pageMode: "create",
    editingNoteId: "",
    editingNoteDate: todayKey(),
    editingNoteDateText: displayDate(todayKey()),
    editingNoteContent: "",
    editingNoteAttachments: [],
    noteSavedContent: "",
    noteSavedAttachments: [],
    noteDirty: false,
    attachmentPanelOpen: false,
    attachmentOptions: [
      { type: "location", label: "关联地点" },
      { type: "image", label: "添加图片" },
      { type: "record", label: "录音" },
      { type: "camera", label: "拍照" },
      { type: "scan", label: "扫描文本" }
    ]
  },

  onLoad(query) {
    const id = query && query.id ? query.id : "";
    const date = normalizeDate(query && (query.date || query.dateKey));
    const isWrite = query && query.mode === "write";
    const note = id ? (getBoundlessNoteById(id) || findLegacyNote(id)) : null;
    const draft = isWrite && !note ? getBoundlessDraftByDate(date) : null;

    if (id && !note) {
      wx.showToast({ title: "未找到无边记", icon: "none" });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }

    const initial = note || draft || {
      id: "",
      date,
      content: query && query.content ? decodeURIComponent(query.content) : "",
      attachments: [],
      status: isWrite ? "draft" : "done"
    };
    this.loadNote(initial, isWrite ? "write" : note ? "edit" : "write");
  },

  loadNote(note, mode) {
    const date = normalizeDate(note.date || note.dateKey || todayKey());
    const content = note.content || note.text || note.note || "";
    const attachments = (note.attachments || []).map(normalizeAttachment);
    this.setData({
      pageMode: mode,
      editingNoteId: note.id || "",
      editingNoteDate: date,
      editingNoteDateText: displayDate(date),
      editingNoteContent: content,
      editingNoteAttachments: attachments,
      noteSavedContent: content,
      noteSavedAttachments: attachments,
      noteDirty: false,
      attachmentPanelOpen: false
    });
  },

  updateNoteContent(e) {
    const content = e.detail.value;
    this.setData({
      editingNoteContent: content,
      noteDirty: content !== this.data.noteSavedContent
    });
  },

  onDateChange(e) {
    const date = normalizeDate(e.detail.value);
    this.setData({
      editingNoteDate: date,
      editingNoteDateText: displayDate(date),
      noteDirty: true
    });
  },

  toggleAttachmentPanel() {
    this.setData({ attachmentPanelOpen: !this.data.attachmentPanelOpen });
  },

  handleAttachmentOption(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ attachmentPanelOpen: false });
    if (type === "image") {
      this.chooseImage(["album"], "图片", "image");
      return;
    }
    if (type === "camera") {
      this.chooseImage(["camera"], "照片", "camera");
      return;
    }
    if (type === "location") {
      this.chooseLocation();
      return;
    }
    if (type === "record") {
      this.addAttachment({
        type: "record",
        label: "录音",
        value: "录音功能待完善"
      });
      wx.showToast({ title: "录音功能待完善", icon: "none" });
      return;
    }
    if (type === "scan") {
      this.addAttachment({
        type: "scan",
        label: "扫描文本",
        value: "扫描文本功能待完善"
      });
      wx.showToast({ title: "扫描文本功能待完善", icon: "none" });
    }
  },

  chooseImage(sourceType, label, type) {
    wx.chooseImage({
      count: 1,
      sourceType,
      success: (res) => {
        const path = (res.tempFilePaths && res.tempFilePaths[0]) || "";
        if (!path) return;
        this.addAttachment({ type, label, value: path });
      }
    });
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.addAttachment({
          type: "location",
          label: "地点",
          value: res.name || res.address || "已关联地点"
        });
      }
    });
  },

  addAttachment(item) {
    const attachments = this.data.editingNoteAttachments.concat(normalizeAttachment(item));
    this.setData({
      editingNoteAttachments: attachments,
      noteDirty: true
    });
  },

  removeAttachment(e) {
    const id = e.currentTarget.dataset.id;
    const attachments = this.data.editingNoteAttachments.filter((item) => item.id !== id);
    this.setData({
      editingNoteAttachments: attachments,
      noteDirty: true
    });
  },

  cancelEdit() {
    if (!this.data.noteDirty) {
      this.leavePage();
      return;
    }
    wx.showModal({
      title: "取消编辑",
      content: "本次修改尚未保存，是否放弃？",
      confirmText: "放弃",
      cancelText: "继续编辑",
      confirmColor: "#ef4444",
      success: (res) => {
        if (res.confirm) this.leavePage();
      }
    });
  },

  saveDraftAndExit() {
    if (this.data.pageMode !== "write") return;
    this.persistNote("draft", "已保存");
  },

  finishEdit() {
    this.persistNote("done", "已完成");
  },

  persistNote(status, toastTitle) {
    const content = this.data.editingNoteContent;
    const attachments = this.data.editingNoteAttachments || [];
    if (!content.trim() && !attachments.length) {
      wx.showToast({ title: "请写下内容", icon: "none" });
      return;
    }
    const patch = {
      date: this.data.editingNoteDate,
      content,
      attachments,
      status
    };
    const note = this.data.editingNoteId
      ? updateBoundlessNote(this.data.editingNoteId, patch)
      : createBoundlessNote(this.data.editingNoteDate, patch);
    if (!note) {
      wx.showToast({ title: "保存失败", icon: "none" });
      return;
    }
    if (status !== "draft") {
      api.note.create({
        id: note.cloudId || "",
        clientId: note.id,
        date: note.date,
        type: "boundless",
        content: note.content,
        attachments: note.attachments || []
      }).catch((error) => {
        console.warn("note save pending local only", error.message);
      });
    }
    this.setData({
      editingNoteId: note.id,
      noteSavedContent: note.content || "",
      noteSavedAttachments: note.attachments || [],
      noteDirty: false
    });
    wx.showToast({ title: toastTitle, icon: "success" });
    setTimeout(() => this.leavePage(true), 320);
  },

  deleteCurrentNote() {
    if (this.data.pageMode !== "edit") return;
    const id = this.data.editingNoteId;
    if (!id) {
      wx.showToast({ title: "未找到无边记", icon: "none" });
      return;
    }
    const note = getBoundlessNoteById(id) || findLegacyNote(id);
    if (!note) {
      wx.showToast({ title: "未找到无边记", icon: "none" });
      return;
    }
    wx.showModal({
      title: "删除无边记",
      content: "删除后该无边记将不再显示。",
      confirmText: "删除",
      cancelText: "取消",
      confirmColor: "#ef4444",
      success: (res) => {
        if (!res.confirm) return;
        if (getBoundlessNoteById(id)) {
          deleteBoundlessNote(id);
        } else {
          removeItem(KEYS.diaries, id);
        }
        api.note.delete(note.cloudId || note._id || id, { clientId: id }).catch(() => {});
        wx.showToast({ title: "已删除", icon: "success" });
        setTimeout(() => this.leavePage(true), 320);
      }
    });
  },

  leavePage(shouldRefresh) {
    if (shouldRefresh) refreshPreviousPage();
    const pages = getCurrentPages ? getCurrentPages() : [];
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: "/pages/home/home" });
    }
  }
});
