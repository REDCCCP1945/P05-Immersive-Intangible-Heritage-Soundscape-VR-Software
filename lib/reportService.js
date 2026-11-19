const store = require("./store");
const audit = require("./audit");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function build(session) {
  const duration = Math.max(1, Number(session.elapsedSec) || 1);
  const breathCycles = Number(session.metrics.breathCycles) || 0;
  const gazeHits = Number(session.metrics.gazeHits) || 0;
  const avgMotion = Number(session.metrics.avgMotion) || 0;
  const focus = clamp(Math.round(100 - avgMotion * 1.2 + gazeHits * 1.5), 0, 100);
  const relax = clamp(Math.round(100 - avgMotion * 1.5 + breathCycles * 1), 0, 100);
  const completion = clamp(Math.round((breathCycles * 19) / duration * 100), 0, 100);
  const overall = Math.round(focus * 0.4 + relax * 0.35 + completion * 0.25);
  let conclusion = "本次体验完成度较低，建议缩短时长或先进行呼吸练习。";
  if (overall >= 85) conclusion = "呼吸节律稳定，视角移动较少，放松状态良好。";
  else if (overall >= 70) conclusion = "整体平稳，仍有一定视角波动，可通过延长屏气阶段改善。";
  else if (overall >= 55) conclusion = "完成主要流程，专注与放松仍有提升空间。";
  let advice = "建议在安静环境中再次体验，并保持音量适中。";
  if (focus < 60) advice = "凝视命中偏少，可先选择山居静心主题，降低凝视目标数量。";
  else if (relax < 60) advice = "视角移动偏高，可降低亮度并缩短单次时长。";
  else if (completion < 60) advice = "呼吸周期完成率偏低，建议跟随光球节律并延长屏气阶段。";
  const row = {
    id: store.id("REP"),
    sessionId: session.id,
    participantCode: session.participantCode,
    themeName: session.themeName,
    durationSec: duration,
    gazeHits: gazeHits,
    breathCycles: breathCycles,
    avgMotion: avgMotion,
    focusScore: focus,
    relaxScore: relax,
    completion: completion,
    overall: overall,
    conclusion: conclusion,
    advice: advice,
    status: "completed",
    createdAt: store.now()
  };
  store.db.reports.unshift(row);
  session.reportId = row.id;
  return row;
}

function buildAborted(session) {
  const row = {
    id: store.id("REP"),
    sessionId: session.id,
    participantCode: session.participantCode,
    themeName: session.themeName,
    durationSec: Math.max(1, Number(session.elapsedSec) || 1),
    gazeHits: Number(session.metrics.gazeHits) || 0,
    breathCycles: Number(session.metrics.breathCycles) || 0,
    avgMotion: Number(session.metrics.avgMotion) || 0,
    focusScore: 0,
    relaxScore: 0,
    completion: 0,
    overall: 0,
    conclusion: "本次体验中止，未形成完整放松周期。",
    advice: "如无不适，可在休息后重新开始；如出现眩晕，应停止使用并联系现场人员。",
    status: "aborted",
    createdAt: store.now()
  };
  store.db.reports.unshift(row);
  session.reportId = row.id;
  return row;
}

function list(ctx) {
  const query = ctx.query;
  const keyword = (query.get("keyword") || "").trim();
  let rows = store.db.reports.slice();
  if (keyword) rows = rows.filter(function (item) { return (item.participantCode + item.themeName + item.conclusion).indexOf(keyword) >= 0; });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  const page = Math.max(1, Number(query.get("page") || 1));
  const size = Math.min(50, Math.max(5, Number(query.get("size") || 10)));
  ctx.ok({
    total: rows.length,
    page: page,
    size: size,
    rows: rows.slice((page - 1) * size, page * size),
    summary: {
      total: store.db.reports.length,
      good: store.db.reports.filter(function (item) { return item.overall >= 80; }).length,
      average: store.db.reports.length ? Math.round(store.db.reports.reduce(function (sum, item) { return sum + item.overall; }, 0) / store.db.reports.length) : 0,
      aborted: store.db.reports.filter(function (item) { return item.status === "aborted"; }).length
    }
  });
}

function detail(ctx) {
  const row = store.db.reports.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "报告不存在");
    return;
  }
  const session = store.db.sessions.find(function (item) { return item.id === row.sessionId; });
  ctx.ok({ report: row, session: session });
}

function exportJson(ctx) {
  const row = store.db.reports.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "报告不存在");
    return;
  }
  audit.write(ctx.user, "报告", "导出JSON", row.id, row.participantCode, ctx.req);
  ctx.ok({ filename: row.id + ".json", content: JSON.stringify(row, null, 2), type: "application/json" });
}

function exportCsv(ctx) {
  const row = store.db.reports.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "报告不存在");
    return;
  }
  const header = ["报告编号", "体验者编码", "主题", "时长秒", "凝视命中", "呼吸周期", "平均移动", "专注分", "放松分", "完成度", "综合分", "结论", "建议", "生成时间"];
  const line = [row.id, row.participantCode, row.themeName, row.durationSec, row.gazeHits, row.breathCycles, row.avgMotion, row.focusScore, row.relaxScore, row.completion, row.overall, row.conclusion, row.advice, row.createdAt];
  audit.write(ctx.user, "报告", "导出CSV", row.id, row.participantCode, ctx.req);
  ctx.ok({ filename: row.id + ".csv", content: header.join(",") + "\r\n" + line.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(","), type: "text/csv" });
}

module.exports = {
  build: build,
  buildAborted: buildAborted,
  list: list,
  detail: detail,
  exportJson: exportJson,
  exportCsv: exportCsv
};
