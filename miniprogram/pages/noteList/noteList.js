const { listBoundlessNoteGroups, getBoundlessNoteById } = require("../../utils/storage");

function previewText(item) {
  const value = item.content || item.text || item.note || "";
  return value.trim() || "空白无边记";
}

Page({
  data: {
    groups: []
  },

  onLoad() {
    this.loadNotes();
  },

  onShow() {
    this.loadNotes();
  },

  loadNotes() {
    const groups = listBoundlessNoteGroups().map((group) => ({
      date: group.date,
      items: group.items.map((item) => ({
        id: item.id,
        date: item.date,
        preview: previewText(item),
        attachmentCount: (item.attachments || []).length,
        updatedAt: `${item.updatedAt || item.createdAt || ""}`.slice(11, 16)
      }))
    }));
    this.setData({ groups });
  },

  createNote() {
    wx.navigateTo({ url: "/pages/boundlessNote/boundlessNote" });
  },

  editNote(e) {
    const id = e.currentTarget.dataset.id;
    const date = e.currentTarget.dataset.date || "";
    if (!id) return;
    const note = getBoundlessNoteById(id);
    const targetDate = (note && note.date) || date;
    wx.navigateTo({ url: `/pages/boundlessNote/boundlessNote?id=${id}&date=${targetDate}` });
  }
});
