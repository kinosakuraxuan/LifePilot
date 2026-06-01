const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function success(data) {
  return { code: 0, message: "success", data };
}

function fail(code, message) {
  return { code, message, data: null };
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDate(dateKey) {
  const parts = dateKey.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toDateTime(dateKey, time, allDay) {
  if (!isDateKey(dateKey)) return null;
  return new Date(`${dateKey}T${allDay ? "00:00" : (time || "00:00")}:00+08:00`);
}

function normalizeType(value) {
  const allowed = ["course", "task", "exam", "meeting", "habit", "personal", "schedule"];
  return allowed.includes(value) ? value : "schedule";
}

async function findOwnSchedule(openid, id) {
  if (!id) return null;
  const byDoc = await db.collection("schedules").doc(id).get().catch(() => null);
  if (byDoc && byDoc.data && byDoc.data.openid === openid) return byDoc.data;
  const byClient = await db.collection("schedules").where({ openid, clientId: id }).limit(1).get();
  return byClient.data[0] || null;
}

async function handleCreate(event, openid) {
  const title = cleanText(event.title, 80);
  if (!title) return fail(400, "title is required");

  const startDateKey = event.startDateKey || event.dateKey || event.date;
  const endDateKey = event.endDateKey || startDateKey;
  if (!isDateKey(startDateKey) || !isDateKey(endDateKey)) {
    return fail(400, "valid startDateKey and endDateKey are required");
  }

  const allDay = !!(event.isAllDay || event.allDay);
  const startAt = toDateTime(startDateKey, event.startTime, allDay);
  const endAt = toDateTime(endDateKey, event.endTime, allDay);
  if (!allDay && startAt && endAt && endAt.getTime() < startAt.getTime()) {
    return fail(400, "end time cannot be earlier than start time");
  }

  const parts = startDateKey.split("-").map(Number);
  const now = db.serverDate();
  const payload = {
    openid,
    userId: openid,
    clientId: cleanText(event.clientId || event.id, 80),
    title,
    type: normalizeType(event.type),
    status: event.status || "todo",
    priority: event.priority || "medium",
    location: cleanText(event.location, 120),
    date: startDateKey,
    dateKey: startDateKey,
    year: parts[0],
    month: parts[1],
    day: parts[2],
    startDateKey,
    endDateKey,
    startTime: allDay ? "" : cleanText(event.startTime, 10),
    endTime: allDay ? "" : cleanText(event.endTime, 10),
    startAt,
    endAt,
    isAllDay: allDay,
    allDay,
    repeatRule: event.repeatRule && typeof event.repeatRule === "object" ? event.repeatRule : { type: "never" },
    reminder: event.reminder || event.remindAt || "none",
    url: cleanText(event.url, 300),
    note: cleanText(event.note || event.longText, 1000),
    source: event.source || "manual",
    color: cleanText(event.color || "#ef4444", 30),
    focusRequired: !!event.focusRequired,
    focusMinutes: Number(event.focusMinutes || 0),
    isCountdown: !!event.isCountdown,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  const existed = payload.clientId
    ? await db.collection("schedules").where({ openid, clientId: payload.clientId }).limit(1).get()
    : { data: [] };
  if (existed.data.length) {
    await db.collection("schedules").doc(existed.data[0]._id).update({ data: payload });
    return success({ id: existed.data[0]._id, schedule: Object.assign({ _id: existed.data[0]._id }, payload), updated: true });
  }

  const res = await db.collection("schedules").add({ data: payload });
  return success({ id: res._id, schedule: Object.assign({ _id: res._id }, payload), created: true });
}

async function handleUpdate(event, openid) {
  const id = String(event.id || event._id || event.clientId || "").trim();
  if (!id) return fail(400, "id is required");

  const existed = await findOwnSchedule(openid, id);
  if (!existed) return fail(404, "schedule not found");

  const updates = { updatedAt: db.serverDate() };
  const allowedStatus = ["todo", "doing", "done", "postponed", "pending"];
  const allowedPriority = ["low", "medium", "high"];

  if (event.status !== undefined) {
    if (!allowedStatus.includes(event.status)) return fail(400, "invalid status");
    updates.status = event.status;
    if (event.status === "done") updates.completedAt = db.serverDate();
  }
  if (event.priority !== undefined) {
    if (!allowedPriority.includes(event.priority)) return fail(400, "invalid priority");
    updates.priority = event.priority;
  }
  if (event.title !== undefined) updates.title = cleanText(event.title, 80);
  if (event.location !== undefined) updates.location = cleanText(event.location, 120);
  if (event.note !== undefined) updates.note = cleanText(event.note, 1000);
  if (event.startTime !== undefined) updates.startTime = cleanText(event.startTime, 10);
  if (event.endTime !== undefined) updates.endTime = cleanText(event.endTime, 10);
  if (event.isDeleted !== undefined) updates.isDeleted = !!event.isDeleted;
  if (event.focusMinutesDelta !== undefined) updates.focusMinutes = _.inc(Number(event.focusMinutesDelta) || 0);

  await db.collection("schedules").doc(existed._id).update({ data: updates });
  return success({ id: existed._id, updated: true });
}

async function handleDelete(event, openid) {
  const id = String(event.id || event._id || event.clientId || "").trim();
  if (!id) return fail(400, "id is required");

  const existed = await findOwnSchedule(openid, id);
  if (!existed) return fail(404, "schedule not found");

  await db.collection("schedules").doc(existed._id).update({
    data: { isDeleted: true, updatedAt: db.serverDate() }
  });
  return success({ id: existed._id, deleted: true });
}

function isRepeatHit(item, dateKey) {
  const rule = item.repeatRule || {};
  if (!rule.type || rule.type === "never") return false;
  const startKey = item.startDateKey || item.dateKey;
  if (!isDateKey(startKey) || dateKey < startKey) return false;
  if (rule.endDate && dateKey > rule.endDate) return false;

  const target = toDate(dateKey);
  const start = toDate(startKey);
  const diffDays = Math.floor((target - start) / 86400000);
  if (diffDays < 0) return false;
  if (rule.type === "daily") return diffDays % Number(rule.interval || 1) === 0;
  if (rule.type === "weekly" || rule.type === "biweekly") {
    const interval = rule.type === "biweekly" ? 2 : Number(rule.interval || 1);
    const weekDiff = Math.floor(diffDays / 7);
    const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays : [start.getDay()];
    return weekDiff % interval === 0 && weekdays.includes(target.getDay());
  }
  if (rule.type === "monthly") return target.getDate() === start.getDate();
  if (rule.type === "yearly") return target.getMonth() === start.getMonth() && target.getDate() === start.getDate();
  return false;
}

function mapSchedule(item, source) {
  const searchIndexId = item._id || item.clientId || "";
  return {
    id: item.clientId || item._id,
    cloudId: item._id,
    _id: item._id,
    clientId: item.clientId || "",
    searchIndexId,
    title: item.title || item.courseName || item.name || "Untitled",
    type: item.type || source,
    status: item.status || "todo",
    priority: item.priority || "medium",
    date: item.dateKey || item.date || "",
    dateKey: item.dateKey || item.date || "",
    timeText: item.isAllDay || item.allDay ? "All day" : `${item.startTime || ""}${item.endTime ? ` - ${item.endTime}` : ""}`,
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    location: item.location || item.classroom || "",
    color: item.color || "#ef4444",
    source
  };
}

async function handleListByDate(event, openid) {
  const date = event.date || event.dateKey;
  if (!isDateKey(date)) return fail(400, "valid date is required");

  const direct = await db.collection("schedules")
    .where({ openid, dateKey: date, isDeleted: false })
    .orderBy("startTime", "asc")
    .get();
  const repeatCandidates = await db.collection("schedules")
    .where({ openid, isDeleted: false, dateKey: _.lt(date) })
    .limit(100)
    .get();
  const courses = await db.collection("courses")
    .where({ openid, dateKey: date, isDeleted: false })
    .orderBy("startTime", "asc")
    .get()
    .catch(() => ({ data: [] }));

  const repeated = (repeatCandidates.data || []).filter((item) => isRepeatHit(item, date));
  const items = (direct.data || [])
    .concat(repeated)
    .concat(courses.data || [])
    .map((item) => mapSchedule(item, item.courseName ? "course" : "schedule"))
    .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

  return success(items);
}

async function handleListByMonth(event, openid) {
  const year = Number(event.year);
  const month = Number(event.month);
  if (!year || month < 1 || month > 12) return fail(400, "valid year and month are required");
  const monthStart = `${year}-${pad(month)}-01`;
  const monthEnd = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;

  const schedules = await db.collection("schedules")
    .where({ openid, year, month, isDeleted: false })
    .orderBy("day", "asc")
    .get();
  const repeatCandidates = await db.collection("schedules")
    .where({ openid, isDeleted: false, dateKey: _.lte(monthEnd) })
    .limit(200)
    .get();
  const courses = await db.collection("courses")
    .where({ openid, year, month, isDeleted: false })
    .orderBy("day", "asc")
    .get()
    .catch(() => ({ data: [] }));

  const daysMap = {};
  function pushDayItem(item, date, source) {
    if (!daysMap[date]) daysMap[date] = { date, count: 0, items: [] };
    daysMap[date].count += 1;
    daysMap[date].items.push({
      id: item._id,
      clientId: item.clientId || "",
      title: item.title || item.courseName || item.name || "Untitled",
      type: item.type || source || (item.courseName ? "course" : "schedule"),
      color: item.color || "#ef4444",
      status: item.status || "todo",
      startTime: item.startTime || "",
      endTime: item.endTime || ""
    });
  }

  const scheduleById = {};
  (schedules.data || []).concat(repeatCandidates.data || []).forEach((item) => {
    scheduleById[item._id] = item;
  });

  Object.keys(scheduleById).forEach((id) => {
    const item = scheduleById[id];
    for (let day = 1; day <= new Date(year, month, 0).getDate(); day += 1) {
      const date = `${year}-${pad(month)}-${pad(day)}`;
      if (date < monthStart || date > monthEnd) continue;
      const directDate = item.dateKey || `${item.year}-${pad(Number(item.month))}-${pad(Number(item.day))}`;
      if (directDate === date || isRepeatHit(item, date)) {
        pushDayItem(item, date, "schedule");
      }
    }
  });

  (courses.data || []).forEach((item) => {
    const date = item.dateKey || `${year}-${pad(month)}-${pad(item.day)}`;
    pushDayItem(item, date, "course");
  });

  return success({ days: Object.keys(daysMap).sort().map((date) => daysMap[date]) });
}

function normalizeKeyword(value) {
  return String(value || "").trim().slice(0, 40);
}

function buildMatcher(keyword) {
  return db.RegExp({
    regexp: keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    options: "i"
  });
}

async function searchCollection(openid, collectionName, keyword, source) {
  const matcher = buildMatcher(keyword);
  const conditions = [
    { openid, title: matcher },
    { openid, name: matcher },
    { openid, courseName: matcher },
    { openid, type: matcher },
    { openid, location: matcher },
    { openid, classroom: matcher },
    { openid, date: matcher },
    { openid, dateKey: matcher },
    { openid, note: matcher }
  ];

  try {
    const res = await db.collection(collectionName).where(_.or(conditions)).limit(20).get();
    return (res.data || [])
      .filter((item) => !item.isDeleted)
      .map((item) => mapSchedule(item, source));
  } catch (error) {
    console.error(`search ${collectionName} failed`, error);
    return [];
  }
}

async function handleSearch(event, openid) {
  const keyword = normalizeKeyword(event.keyword);
  if (!keyword) return success({ keyword, count: 0, results: [] });
  const results = (await searchCollection(openid, "schedules", keyword, "schedule"))
    .concat(await searchCollection(openid, "courses", keyword, "course"));
  return success({ keyword, count: results.length, results });
}

async function handleParse(event) {
  const text = String(event.text || event.voiceText || "").trim().slice(0, 1000);
  if (!text) return fail(400, "text is required");

  const base = event.baseDate ? new Date(event.baseDate) : new Date();
  const date = new Date(Number.isNaN(base.getTime()) ? Date.now() : base.getTime());
  if (/tomorrow|\u660e\u5929/i.test(text)) date.setDate(date.getDate() + 1);

  const startTime = /3(:00)?\s*pm|15:00|\u4e09\u70b9|3\u70b9/i.test(text) ? "15:00" : "19:00";
  return success({
    title: text.slice(0, 30) || "New schedule",
    location: "",
    dateKey: toDateKey(date),
    startTime,
    endTime: startTime === "15:00" ? "16:00" : "20:00",
    reminder: /30|half|\u534a\u5c0f\u65f6/i.test(text) ? "30 min before" : "None",
    type: /exam|\u8003\u8bd5/i.test(text) ? "exam" : "schedule",
    priority: "medium",
    sourceText: text
  });
}

exports.main = async (event) => {
  const action = event && event.action;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) return fail(401, "login required");

  try {
    switch (action) {
      case "create":
        return await handleCreate(event, openid);
      case "update":
        return await handleUpdate(event, openid);
      case "delete":
        return await handleDelete(event, openid);
      case "listByDate":
        return await handleListByDate(event, openid);
      case "listByMonth":
        return await handleListByMonth(event, openid);
      case "search":
        return await handleSearch(event, openid);
      case "parse":
        return await handleParse(event, openid);
      default:
        return fail(404, `unknown action: ${action || ""}`);
    }
  } catch (error) {
    console.error("scheduleService error", action, error);
    return fail(500, "server error");
  }
};
