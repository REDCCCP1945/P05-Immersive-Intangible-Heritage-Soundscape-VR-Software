const store = require("./store");
const audit = require("./audit");

const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55以上"];
const GENDERS = ["女", "男", "不便说明"];

function list(ctx) {
  const query = ctx.query;
  const keyword = (query.get("keyword") || "").trim();
  const status = query.get("status") || "";
  let rows = store.db.participants.slice();
  if (status) rows = rows.filter(function (item) { return item.status === status; });
  if (keyword) rows = rows.filter(function (item) { return (item.code + item.note + item.ageBand).indexOf(keyword) >= 0; });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  const page = Math.max(1, Number(query.get("page") || 1));
  const size = Math.min(50, Math.max(5, Number(query.get("size") || 10)));
  const total = rows.length;
  ctx.ok({
    total: total,
    page: page,
    size: size,
    rows: rows.slice((page - 1) * size, page * size),
    summary: {
      total: store.db.participants.length,
      active: store.db.participants.filter(function (item) { return item.status === "active"; }).length,
      archived: store.db.participants.filter(function (item) { return item.status === "archived"; }).length,
      today: store.db.participants.filter(function (item) { return item.code.indexOf(new Date().toISOString().slice(0, 10).replace(/-/g, "")) === 0; }).length
    },
    ageBands: AGE_BANDS,
    genders: GENDERS
  });
}

function detail(ctx) {
  const row = store.db.participants.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "体验者不存在");
    return;
  }
  const sessions = store.db.sessions.filter(function (item) { return item.participantId === row.id; });
  ctx.ok({ participant: row, sessions: sessions });
}

function nextCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = store.db.participants.filter(function (item) { return item.code.indexOf(date) === 0; }).length + 1;
  return date + "-" + String(count).padStart(3, "0");
}

function create(ctx) {
  const body = ctx.body || {};
  const ageBand = String(body.ageBand || "");
  const gender = String(body.gender || "不便说明");
  const prePressure = Number(body.prePressure);
  const note = String(body.note || "").trim();
  if (AGE_BANDS.indexOf(ageBand) < 0) {
    ctx.fail(400, "请选择有效的年龄段", "ageBand");
    return;
  }
  if (GENDERS.indexOf(gender) < 0) {
    ctx.fail(400, "性别选项无效", "gender");
    return;
  }
  if (!Number.isFinite(prePressure) || prePressure < 0 || prePressure > 10) {
    ctx.fail(400, "压力自评应为0到10", "prePressure");
    return;
  }
  if (note.length > 200) {
    ctx.fail(400, "备注不能超过200个字符", "note");
    return;
  }
  const row = {
    id: store.id("PAR"),
    code: nextCode(),
    ageBand: ageBand,
    gender: gender,
    prePressure: prePressure,
    note: note,
    status: "active",
    createdBy: ctx.user.id,
    createdByName: ctx.user.name,
    createdAt: store.now(),
    updatedAt: store.now()
  };
  store.db.participants.unshift(row);
  store.save();
  audit.write(ctx.user, "档案", "创建体验者", row.code, ageBand, ctx.req);
  ctx.ok({ participant: row });
}

function update(ctx) {
  const row = store.db.participants.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "体验者不存在");
    return;
  }
  const body = ctx.body || {};
  if (body.ageBand !== undefined) {
    if (AGE_BANDS.indexOf(String(body.ageBand)) < 0) {
      ctx.fail(400, "请选择有效的年龄段", "ageBand");
      return;
    }
    row.ageBand = String(body.ageBand);
  }
  if (body.gender !== undefined) {
    if (GENDERS.indexOf(String(body.gender)) < 0) {
      ctx.fail(400, "性别选项无效", "gender");
      return;
    }
    row.gender = String(body.gender);
  }
  if (body.prePressure !== undefined) {
    const value = Number(body.prePressure);
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      ctx.fail(400, "压力自评应为0到10", "prePressure");
      return;
    }
    row.prePressure = value;
  }
  if (body.note !== undefined) {
    const note = String(body.note).trim();
    if (note.length > 200) {
      ctx.fail(400, "备注不能超过200个字符", "note");
      return;
    }
    row.note = note;
  }
  row.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "档案", "修改体验者", row.code, "", ctx.req);
  ctx.ok({ participant: row });
}

function archive(ctx) {
  const row = store.db.participants.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "体验者不存在");
    return;
  }
  row.status = row.status === "archived" ? "active" : "archived";
  row.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "档案", row.status === "archived" ? "归档体验者" : "恢复体验者", row.code, "", ctx.req);
  ctx.ok({ participant: row });
}

module.exports = {
  AGE_BANDS: AGE_BANDS,
  GENDERS: GENDERS,
  list: list,
  detail: detail,
  create: create,
  update: update,
  archive: archive
};
