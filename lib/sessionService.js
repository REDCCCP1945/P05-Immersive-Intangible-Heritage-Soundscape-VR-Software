const crypto = require("crypto");
const store = require("./store");
const audit = require("./audit");
const metrics = require("./metricsService");
const reportService = require("./reportService");

const STATUS_LABELS = {
  prepared: "已准备",
  running: "体验中",
  paused: "已暂停",
  completed: "已完成",
  aborted: "已中止"
};

function addEvent(session, type, message) {
  session.events.push({ time: store.now(), type: type, message: message });
  if (session.events.length > 200) session.events.splice(0, session.events.length - 200);
}

function findSession(id) {
  return store.db.sessions.find(function (item) { return item.id === id; });
}

function list(ctx) {
  const query = ctx.query;
  const status = query.get("status") || "";
  const themeId = query.get("themeId") || "";
  const keyword = (query.get("keyword") || "").trim();
  let rows = store.db.sessions.slice();
  if (status) rows = rows.filter(function (item) { return item.status === status; });
  if (themeId) rows = rows.filter(function (item) { return item.themeId === themeId; });
  if (keyword) rows = rows.filter(function (item) { return (item.participantCode + item.themeName).indexOf(keyword) >= 0; });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  const page = Math.max(1, Number(query.get("page") || 1));
  const size = Math.min(50, Math.max(5, Number(query.get("size") || 10)));
  const total = rows.length;
  ctx.ok({
    total: total,
    page: page,
    size: size,
    rows: rows.slice((page - 1) * size, page * size).map(function (item) {
      return Object.assign({}, item, { statusLabel: STATUS_LABELS[item.status], summary: metrics.summary(item) });
    }),
    summary: {
      total: store.db.sessions.length,
      prepared: store.db.sessions.filter(function (item) { return item.status === "prepared"; }).length,
      running: store.db.sessions.filter(function (item) { return item.status === "running"; }).length,
      completed: store.db.sessions.filter(function (item) { return item.status === "completed"; }).length,
      aborted: store.db.sessions.filter(function (item) { return item.status === "aborted"; }).length
    }
  });
}

function detail(ctx) {
  const row = findSession(ctx.params[0]);
  if (!row) {
    ctx.fail(404, "会话不存在");
    return;
  }
  const participant = store.db.participants.find(function (item) { return item.id === row.participantId; });
  const theme = store.db.themes.find(function (item) { return item.id === row.themeId; });
  const report = row.reportId ? store.db.reports.find(function (item) { return item.id === row.reportId; }) : null;
  ctx.ok({ session: Object.assign({}, row, { statusLabel: STATUS_LABELS[row.status] }), participant: participant, theme: theme, report: report, summary: metrics.summary(row) });
}

function create(ctx) {
  const body = ctx.body || {};
  const participant = store.db.participants.find(function (item) { return item.id === body.participantId; });
  if (!participant) {
    ctx.fail(400, "请选择体验者", "participantId");
    return;
  }
  if (participant.status !== "active") {
    ctx.fail(400, "该体验者已归档，不能创建会话", "participantId");
    return;
  }
  const theme = store.db.themes.find(function (item) { return item.id === body.themeId; });
  if (!theme) {
    ctx.fail(400, "请选择疗愈主题", "themeId");
    return;
  }
  if (!theme.enabled) {
    ctx.fail(400, "该主题已停用", "themeId");
    return;
  }
  const volume = Number(body.volume === undefined ? store.db.settings.defaultVolume : body.volume);
  if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
    ctx.fail(400, "音量应为0到100", "volume");
    return;
  }
  const row = {
    id: store.id("SES"),
    participantId: participant.id,
    participantCode: participant.code,
    themeId: theme.id,
    themeName: theme.name,
    scene: theme.scene,
    durationMin: theme.durationMin,
    breathPattern: theme.breathPattern,
    audioPreset: theme.audioPreset,
    focusTargets: theme.focusTargets,
    status: "prepared",
    token: crypto.randomBytes(16).toString("hex"),
    tokenExpiresAt: Date.now() + 2 * 60 * 60 * 1000,
    control: { volume: volume, brightness: store.db.settings.defaultBrightness || 60, message: "" },
    command: "",
    startedAt: "",
    endedAt: "",
    elapsedSec: 0,
    metrics: { gazeHits: 0, breathCycles: 0, motionIndex: 0, avgMotion: 0, focusScore: 100, relaxScore: 100, completion: 0, overall: 100, phase: "" },
    samples: [],
    events: [{ time: store.now(), type: "create", message: "会话已创建" }],
    reportId: "",
    createdBy: ctx.user.id,
    createdByName: ctx.user.name,
    createdAt: store.now()
  };
  store.db.sessions.unshift(row);
  store.save();
  audit.write(ctx.user, "会话", "创建会话", row.id, participant.code + "/" + theme.name, ctx.req);
  ctx.ok({ session: row });
}

function start(ctx) {
  const row = findSession(ctx.params[0]);
  if (!row) {
    ctx.fail(404, "会话不存在");
    return;
  }
  if (row.status !== "prepared") {
    ctx.fail(409, "只有已准备的会话可以开始");
    return;
  }
  row.status = "running";
  row.startedAt = store.now();
  row.tokenExpiresAt = Date.now() + 2 * 60 * 60 * 1000;
  row.command = "start";
  addEvent(row, "start", "体验开始");
  store.save();
  audit.write(ctx.user, "会话", "开始体验", row.id, row.participantCode, ctx.req);
  ctx.ok({ session: row });
}

function pause(ctx) {
  const row = findSession(ctx.params[0]);
  if (!row) {
    ctx.fail(404, "会话不存在");
    return;
  }
  if (row.status !== "running") {
    ctx.fail(409, "只有体验中的会话可以暂停");
    return;
  }
  row.status = "paused";
  row.command = "pause";
  addEvent(row, "pause", "引导者暂停体验");
  store.save();
  audit.write(ctx.user, "会话", "暂停体验", row.id, row.participantCode, ctx.req);
  ctx.ok({ session: row });
}

function resume(ctx) {
  const row = findSession(ctx.params[0]);
  if (!row) {
    ctx.fail(404, "会话不存在");
    return;
  }
  if (row.status !== "paused") {
    ctx.fail(409, "只有暂停中的会话可以继续");
    return;
  }
  row.status = "running";
  row.command = "resume";
  addEvent(row, "resume", "引导者继续体验");
  store.save();
  audit.write(ctx.user, "会话", "继续体验", row.id, row.participantCode, ctx.req);
  ctx.ok({ session: row });
}

function finish(row, body, aborted) {
  if (body && body.elapsedSec !== undefined) metrics.apply(row, body);
  row.status = aborted ? "aborted" : "completed";
  row.endedAt = store.now();
  row.command = "";
  const report = aborted ? reportService.buildAborted(row) : reportService.build(row);
  addEvent(row, aborted ? "abort" : "complete", aborted ? "体验中止" : "体验完成");
  row.summary = metrics.summary(row);
  return report;
}

function stop(ctx) {
  const row = findSession(ctx.params[0]);
  if (!row) {
    ctx.fail(404, "会话不存在");
    return;
  }
  if (row.status !== "running" && row.status !== "paused") {
    ctx.fail(409, "只有进行中的会话可以结束");
    return;
  }
  const report = finish(row, ctx.body || {}, false);
  store.save();
  audit.write(ctx.user, "会话", "结束体验", row.id, row.participantCode, ctx.req);
  ctx.ok({ session: row, report: report });
}

function abort(ctx) {
  const row = findSession(ctx.params[0]);
  if (!row) {
    ctx.fail(404, "会话不存在");
    return;
  }
  if (["completed", "aborted"].indexOf(row.status) >= 0) {
    ctx.fail(409, "该会话已结束");
    return;
  }
  const report = finish(row, ctx.body || {}, true);
  addEvent(row, "emergency", "紧急停止：" + String((ctx.body && ctx.body.reason) || "现场人员操作"));
  store.save();
  audit.write(ctx.user, "会话", "紧急停止", row.id, String((ctx.body && ctx.body.reason) || ""), ctx.req);
  ctx.ok({ session: row, report: report });
}

function control(ctx) {
  const row = findSession(ctx.params[0]);
  if (!row) {
    ctx.fail(404, "会话不存在");
    return;
  }
  const body = ctx.body || {};
  if (body.volume !== undefined) {
    const volume = Number(body.volume);
    if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
      ctx.fail(400, "音量应为0到100", "volume");
      return;
    }
    row.control.volume = Math.round(volume);
  }
  if (body.brightness !== undefined) {
    const brightness = Number(body.brightness);
    if (!Number.isFinite(brightness) || brightness < 0 || brightness > 100) {
      ctx.fail(400, "亮度应为0到100", "brightness");
      return;
    }
    row.control.brightness = Math.round(brightness);
  }
  if (body.message !== undefined) row.control.message = String(body.message).slice(0, 100);
  addEvent(row, "control", "调整音量" + row.control.volume + "，亮度" + row.control.brightness);
  store.save();
  audit.write(ctx.user, "会话", "调整参数", row.id, "音量" + row.control.volume, ctx.req);
  ctx.ok({ session: row });
}

function byToken(token) {
  const row = store.db.sessions.find(function (item) { return item.token === token; });
  if (!row) return { error: 404, message: "体验链接不存在" };
  if (!row.tokenExpiresAt || row.tokenExpiresAt < Date.now()) return { error: 410, message: "体验链接已过期" };
  return { session: row };
}

function publicSession(row) {
  const theme = store.db.themes.find(function (item) { return item.id === row.themeId; });
  const audio = store.db.audioAssets.filter(function (item) { return item.enabled; });
  return {
    id: row.id,
    participantCode: row.participantCode,
    themeName: row.themeName,
    scene: row.scene,
    durationMin: row.durationMin,
    breathPattern: row.breathPattern,
    focusTargets: row.focusTargets,
    status: row.status,
    command: row.command,
    control: row.control,
    elapsedSec: row.elapsedSec,
    summary: metrics.summary(row),
    themeDescription: theme ? theme.description : "",
    audio: audio.map(function (item) {
      return { id: item.id, name: item.name, category: item.category, preset: item.preset, pan: item.pan, distance: item.distance, volume: item.volume };
    })
  };
}

function stateByToken(ctx) {
  const found = byToken(ctx.params[0]);
  if (found.error) {
    ctx.fail(found.error, found.message);
    return;
  }
  ctx.ok({ session: publicSession(found.session) });
}

function beginByToken(ctx) {
  const found = byToken(ctx.params[0]);
  if (found.error) {
    ctx.fail(found.error, found.message);
    return;
  }
  const row = found.session;
  if (row.status === "prepared") {
    row.status = "running";
    row.startedAt = store.now();
    row.tokenExpiresAt = Date.now() + 2 * 60 * 60 * 1000;
    row.command = "";
    addEvent(row, "begin", "体验端开始");
    store.save();
    audit.write({ id: null, username: "experience", role: "EXPERIENCE" }, "会话", "体验端开始", row.id, row.participantCode, ctx.req);
  }
  ctx.ok({ session: publicSession(row) });
}

function metricsByToken(ctx) {
  const found = byToken(ctx.params[0]);
  if (found.error) {
    ctx.fail(found.error, found.message);
    return;
  }
  if (found.session.status !== "running" && found.session.status !== "paused") {
    ctx.fail(409, "会话不在进行中");
    return;
  }
  metrics.apply(found.session, ctx.body || {});
  store.save();
  ctx.ok({ summary: metrics.summary(found.session) });
}

function eventByToken(ctx) {
  const found = byToken(ctx.params[0]);
  if (found.error) {
    ctx.fail(found.error, found.message);
    return;
  }
  const body = ctx.body || {};
  const type = String(body.type || "event").slice(0, 20);
  const message = String(body.message || "").slice(0, 100);
  addEvent(found.session, type, message);
  store.save();
  ctx.ok({});
}

function completeByToken(ctx) {
  const found = byToken(ctx.params[0]);
  if (found.error) {
    ctx.fail(found.error, found.message);
    return;
  }
  const row = found.session;
  if (row.status !== "running" && row.status !== "paused") {
    ctx.fail(409, "会话不在进行中");
    return;
  }
  const report = finish(row, ctx.body || {}, false);
  store.save();
  audit.write({ id: null, username: "experience", role: "EXPERIENCE" }, "会话", "体验端完成", row.id, row.participantCode, ctx.req);
  ctx.ok({ session: row, report: report });
}

function ackByToken(ctx) {
  const found = byToken(ctx.params[0]);
  if (found.error) {
    ctx.fail(found.error, found.message);
    return;
  }
  found.session.command = "";
  store.save();
  ctx.ok({});
}

module.exports = {
  STATUS_LABELS: STATUS_LABELS,
  list: list,
  detail: detail,
  create: create,
  start: start,
  pause: pause,
  resume: resume,
  stop: stop,
  abort: abort,
  control: control,
  stateByToken: stateByToken,
  beginByToken: beginByToken,
  metricsByToken: metricsByToken,
  eventByToken: eventByToken,
  completeByToken: completeByToken,
  ackByToken: ackByToken
};
