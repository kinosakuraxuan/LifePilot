const KEYS = {
  courses: "lifepilot_courses",
  schedules: "lifepilot_schedules",
  records: "lifepilot_records"
};

function readList(key, fallback) {
  return wx.getStorageSync(key) || fallback || [];
}

function writeList(key, value) {
  wx.setStorageSync(key, value);
}

function appendItem(key, item) {
  const list = readList(key, []);
  const next = [{ id: `${Date.now()}`, createdAt: new Date().toISOString(), ...item }, ...list];
  writeList(key, next);
  return next;
}

function removeItem(key, id) {
  const list = readList(key, []);
  const next = list.filter((item) => item.id !== id);
  writeList(key, next);
  return next;
}

module.exports = {
  KEYS,
  readList,
  writeList,
  appendItem,
  removeItem
};
