const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function normalizeKeyword(value) {
  return String(value || "").trim();
}

function buildMatcher(keyword) {
  return db.RegExp({
    regexp: keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    options: "i"
  });
}

async function searchCollection(collectionName, keyword, source) {
  const matcher = buildMatcher(keyword);
  const _ = db.command;

  try {
    const res = await db.collection(collectionName)
      .where(_.or([
        { title: matcher },
        { name: matcher },
        { type: matcher },
        { location: matcher },
        { date: matcher },
        { startTime: matcher },
        { endTime: matcher },
        { remindAt: matcher },
        { note: matcher }
      ]))
      .limit(20)
      .get();

    return (res.data || []).map((item) => ({
      ...item,
      title: item.title || item.name || "\u672a\u547d\u540d\u4e8b\u9879",
      source
    }));
  } catch (error) {
    return [];
  }
}

exports.main = async (event) => {
  const keyword = normalizeKeyword(event.keyword);
  if (!keyword) {
    return { results: [] };
  }

  const schedules = await searchCollection("schedules", keyword, "\u65e5\u7a0b");
  const courses = await searchCollection("courses", keyword, "\u8bfe\u7a0b");
  const results = schedules.concat(courses);

  return {
    keyword,
    count: results.length,
    results
  };
};

