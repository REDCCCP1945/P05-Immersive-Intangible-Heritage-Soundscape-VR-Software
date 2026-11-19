const store = require("./store");
const audit = require("./audit");

const SCENES = ["mountain", "workshop"];
const BREATH_PATTERNS = ["4-7-8"];

function list(ctx) {
  const rows = store.db.themes.map(function (theme) {
    const audio = store.db.audioAssets.find(function (item) { return item.id === theme.audioPreset; });
    return Object.assign({}, theme, {
      audioName: audio ? audio.name : "",
      sessionCount: store.db.sessions.filter(function (item) { return item.themeId === theme.id; }).length
    });
  });
  ctx.ok({ rows: rows, scenes: SCENES, breathPatterns: BREATH_PATTERNS });
}

function detail(ctx) {
  const row = store.db.themes.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "主题不存在");
    return;
  }
  ctx.ok({ theme: row, scenes: SCENES });
}

function validate(body, current) {
  const name = String(body.name === undefined ? (current ? current.name : "") : body.name).trim();
  const code = String(body.code === undefined ? (current ? current.code : "") : body.code).trim();
  const scene = String(body.scene === undefined ? (current ? current.scene : "") : body.scene);
  const durationMin = Number(body.durationMin === undefined ? (current ? current.durationMin : 0) : body.durationMin);
  const focusTargets = Number(body.focusTargets === undefined ? (current ? current.focusTargets : 0) : body.focusTargets);
  const audioPreset = String(body.audioPreset === undefined ? (current ? current.audioPreset : "") : body.audioPreset);
  const description = String(body.description === undefined ? (current ? current.description : "") : body.description).trim();
  if (name.length < 2 || name.length > 30) return { error: "主题名称应为2到30个字符", field: "name" };
  if (!/^[a-z0-9-]{2,40}$/.test(code)) return { error: "主题编码应为2到40位小写字母、数字或连字符", field: "code" };
  if (SCENES.indexOf(scene) < 0) return { error: "场景预设无效", field: "scene" };
  if (!Number.isFinite(durationMin) || durationMin < 5 || durationMin > 30) return { error: "体验时长应为5到30分钟", field: "durationMin" };
  if (!Number.isFinite(focusTargets) || focusTargets < 1 || focusTargets > 8) return { error: "凝视目标数应为1到8", field: "focusTargets" };
  if (!store.db.audioAssets.find(function (item) { return item.id === audioPreset; })) return { error: "音景预设不存在", field: "audioPreset" };
  if (description.length > 200) return { error: "说明不能超过200个字符", field: "description" };
  const duplicate = store.db.themes.find(function (item) { return item.code === code && (!current || item.id !== current.id); });
  if (duplicate) return { error: "主题编码已存在", field: "code" };
  return { name: name, code: code, scene: scene, durationMin: durationMin, focusTargets: focusTargets, audioPreset: audioPreset, description: description };
}

function create(ctx) {
  const body = ctx.body || {};
  const result = validate(body, null);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  const row = Object.assign({
    id: store.id("THEME"),
    breathPattern: "4-7-8",
    enabled: true,
    createdAt: store.now()
  }, result);
  store.db.themes.push(row);
  store.save();
  audit.write(ctx.user, "主题", "新增主题", row.name, row.scene, ctx.req);
  ctx.ok({ theme: row });
}

function update(ctx) {
  const row = store.db.themes.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "主题不存在");
    return;
  }
  const result = validate(ctx.body || {}, row);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  Object.assign(row, result, { updatedAt: store.now() });
  store.save();
  audit.write(ctx.user, "主题", "修改主题", row.name, row.scene, ctx.req);
  ctx.ok({ theme: row });
}

function toggle(ctx) {
  const row = store.db.themes.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "主题不存在");
    return;
  }
  row.enabled = !row.enabled;
  row.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "主题", row.enabled ? "启用主题" : "停用主题", row.name, "", ctx.req);
  ctx.ok({ theme: row });
}

function remove(ctx) {
  const row = store.db.themes.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "主题不存在");
    return;
  }
  const used = store.db.sessions.some(function (item) { return item.themeId === row.id; });
  if (used) {
    ctx.fail(409, "该主题已被会话引用，只能停用");
    return;
  }
  store.db.themes = store.db.themes.filter(function (item) { return item.id !== row.id; });
  store.save();
  audit.write(ctx.user, "主题", "删除主题", row.name, "", ctx.req);
  ctx.ok({});
}

module.exports = {
  SCENES: SCENES,
  list: list,
  detail: detail,
  create: create,
  update: update,
  toggle: toggle,
  remove: remove
};
