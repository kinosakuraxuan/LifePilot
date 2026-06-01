const KEYS = {
  courses: "lifepilot_courses",
  schedules: "lifepilot_schedules",
  records: "lifepilot_records",
  diaries: "lifepilot_diaries",
  boundlessNotes: "lifepilot_boundless_notes",
  userSettings: "lifepilot_user_settings"
};

function readList(key, fallback) {
  return wx.getStorageSync(key) || fallback || [];
}

function writeList(key, value) {
  wx.setStorageSync(key, value);
}

function appendItem(key, item) {
  const list = readList(key, []);
  const next = [Object.assign({ id: `${Date.now()}`, createdAt: new Date().toISOString() }, item)].concat(list);
  writeList(key, next);
  return next;
}

function removeItem(key, id) {
  const list = readList(key, []);
  const next = list.filter((item) => !matchesItemId(item, id));
  writeList(key, next);
  return next;
}

function matchesItemId(item, id) {
  const target = String(id || "");
  if (!target) return false;
  const fallbackSearchIndexId = [
    item.dateKey || item.date || "",
    item.startTime || item.start || "",
    item.endTime || item.end || "",
    item.title || item.name || item.courseName || ""
  ].join("|");
  return [item.id, item._id, item.clientId, item.cloudId, item.searchIndexId, fallbackSearchIndexId]
    .some((value) => String(value || "") === target);
}

function getItemById(key, id) {
  return readList(key, []).find((item) => matchesItemId(item, id)) || null;
}

function updateItem(key, id, patch) {
  const list = readList(key, []);
  const now = new Date().toISOString();
  let updated = null;
  const next = list.map((item) => {
    if (!matchesItemId(item, id)) return item;
    updated = Object.assign({}, item, patch || {}, {
      id: item.id || id,
      clientId: item.clientId || item.id || id,
      updatedAt: now
    });
    return updated;
  });
  writeList(key, next);
  return updated;
}

function todayKey(date) {
  const target = date ? new Date(date) : new Date();
  const year = target.getFullYear();
  const month = `${target.getMonth() + 1}`.padStart(2, "0");
  const day = `${target.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeNoteDate(value) {
  if (!value || value === "今天" || value === "刚刚") return todayKey();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
    const parts = value.split("-");
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  return todayKey();
}

function mergeLegacyNotes(date) {
  const legacy = readList(KEYS.diaries, []);
  return legacy
    .filter((item) => normalizeNoteDate(item.date || item.createdAt) === date)
    .map((item) => item.content)
    .filter(Boolean);
}

function readBoundlessNote(date) {
  const targetDate = normalizeNoteDate(date);
  const notes = readList(KEYS.boundlessNotes, []);
  const current = notes.find((item) => item.date === targetDate);
  if (current) {
    return Object.assign({ attachments: [] }, current, {
      content: current.content || "",
      date: targetDate
    });
  }
  const legacyContent = mergeLegacyNotes(targetDate).join("\n\n");
  const now = new Date().toISOString();
  return {
    id: `note-${targetDate}`,
    date: targetDate,
    content: legacyContent,
    attachments: [],
    createdAt: now,
    updatedAt: now
  };
}

function createBoundlessNote(date, patch) {
  const targetDate = normalizeNoteDate(date);
  const notes = readList(KEYS.boundlessNotes, []);
  const now = new Date().toISOString();
  const note = Object.assign({
    id: `note-${Date.now()}`,
    date: targetDate,
    content: "",
    attachments: [],
    createdAt: now,
    updatedAt: now
  }, patch || {}, {
    date: targetDate,
    updatedAt: now
  });
  writeList(KEYS.boundlessNotes, [note].concat(notes));
  return note;
}

function updateBoundlessNote(id, patch) {
  const notes = readList(KEYS.boundlessNotes, []);
  const now = new Date().toISOString();
  let updated = null;
  const next = notes.map((item) => {
    if (!matchesItemId(item, id)) return item;
    updated = Object.assign({}, item, patch || {}, {
      id: item.id || id,
      clientId: item.clientId || item.id || id,
      date: normalizeNoteDate((patch && patch.date) || item.date),
      attachments: (patch && patch.attachments) || item.attachments || [],
      updatedAt: now
    });
    return updated;
  });
  writeList(KEYS.boundlessNotes, next);
  return updated;
}

function deleteBoundlessNote(id) {
  const notes = readList(KEYS.boundlessNotes, []);
  const next = notes.filter((item) => !matchesItemId(item, id));
  writeList(KEYS.boundlessNotes, next);
  return next;
}

function getBoundlessNoteById(id) {
  return readList(KEYS.boundlessNotes, []).find((item) => matchesItemId(item, id)) || null;
}

function listBoundlessNotesByDate(date) {
  const targetDate = normalizeNoteDate(date);
  return readList(KEYS.boundlessNotes, [])
    .filter((item) => item.status !== "draft" && item.date === targetDate && (item.content || (item.attachments || []).length))
    .sort((a, b) => `${b.updatedAt || b.createdAt || ""}`.localeCompare(`${a.updatedAt || a.createdAt || ""}`));
}

function saveBoundlessNote(date, patch) {
  const targetDate = normalizeNoteDate(date);
  const notes = readList(KEYS.boundlessNotes, []);
  const now = new Date().toISOString();
  const index = notes.findIndex((item) => item.date === targetDate);
  const previous = index >= 0 ? notes[index] : readBoundlessNote(targetDate);
  const nextNote = Object.assign({}, previous, patch, {
    id: previous.id || `note-${targetDate}`,
    date: targetDate,
    attachments: patch.attachments || previous.attachments || [],
    createdAt: previous.createdAt || now,
    updatedAt: now
  });
  const next = index >= 0 ? notes.map((item, itemIndex) => (itemIndex === index ? nextNote : item)) : [nextNote].concat(notes);
  writeList(KEYS.boundlessNotes, next);
  return nextNote;
}

function listBoundlessNotes(limit) {
  const notes = readList(KEYS.boundlessNotes, []).filter((item) => item.status !== "draft");
  const legacy = readList(KEYS.diaries, []).map((item) => ({
    id: item.id,
    date: normalizeNoteDate(item.date || item.createdAt),
    content: item.content || "",
    attachments: [],
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || item.createdAt || ""
  }));
  const merged = notes.concat(legacy)
    .filter((item) => item.content || (item.attachments || []).length)
    .sort((a, b) => `${b.updatedAt || b.createdAt || b.date}`.localeCompare(`${a.updatedAt || a.createdAt || a.date}`));
  return limit ? merged.slice(0, limit) : merged;
}

function getBoundlessDraftByDate(date) {
  const targetDate = normalizeNoteDate(date);
  return readList(KEYS.boundlessNotes, [])
    .filter((item) => item.status === "draft" && item.date === targetDate)
    .sort((a, b) => `${b.updatedAt || b.createdAt || ""}`.localeCompare(`${a.updatedAt || a.createdAt || ""}`))[0] || null;
}

function listBoundlessNoteGroups() {
  const groups = {};
  listBoundlessNotes().forEach((item) => {
    const date = normalizeNoteDate(item.date || item.dateKey || item.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(Object.assign({}, item, { date }));
  });
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      items: groups[date].sort((a, b) => `${b.updatedAt || b.createdAt || ""}`.localeCompare(`${a.updatedAt || a.createdAt || ""}`))
    }));
}

module.exports = {
  KEYS,
  readList,
  writeList,
  appendItem,
  removeItem,
  getItemById,
  updateItem,
  todayKey,
  readBoundlessNote,
  saveBoundlessNote,
  createBoundlessNote,
  updateBoundlessNote,
  deleteBoundlessNote,
  getBoundlessNoteById,
  getBoundlessDraftByDate,
  listBoundlessNotesByDate,
  listBoundlessNotes,
  listBoundlessNoteGroups
};
