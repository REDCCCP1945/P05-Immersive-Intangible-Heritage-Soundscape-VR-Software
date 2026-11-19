const store = require("./store");
const audit = require("./audit");

const CATEGORIES = ["ambient", "point", "interaction"];
const CATEGORY_NAMES = { ambient: "环境底噪", point: "点声源", interaction: "交互音效" };
const PRESETS = ["wind", "water", "room", "guqin", "loom", "chant", "chime", "bell", "wood"];

function list(ctx) {
  const query = ctx.query;
  const category = query.get("category") || "";
  let rows = store.db.audioAssets.slice();
  if (category) rows = rows.filter(function (item) { return item.category === category; });
  rows = rows.map(function (item) {
    return Object.assign({}, item, {
      categoryName: CATEGORY_NAMES[item.category] || item.category,
      themeCount: store.db.themes.filter(function (theme) { return theme.audioPreset === item.id; }).length
    });
  });
  ctx.ok({ rows: rows, categories: CATEGORIES, presets: PRESETS });
}

function validate(body, current) {
  const name = String(body.name === undefined ? (current ? current.name : "") : body.name).trim();
  const category = String(body.category === undefined ? (current ? current.category : "") : body.category);
  const preset = String(body.preset === undefined ? (current ? current.preset : "") : body.preset);
  const pan = Number(body.pan === undefined ? (current ? current.pan : 0) : body.pan);
  const distance = Number(body.distance === undefined ? (current ? current.distance : 1) : body.distance);
  const volume = Number(body.volume === undefined ? (current ? current.volume : 50) : body.volume);
  const description = String(body.description === undefined ? (current ? current.description : "") : body.description).trim();
  if (name.length < 2 || name.length > 30) return { error: "素材名称应为2到30个字符", field: "name" };
  if (CATEGORIES.indexOf(category) < 0) return { error: "素材类别无效", field: "category" };
  if (PRESETS.indexOf(preset) < 0) return { error: "合成预设无效", field: "preset" };
  if (!Number.isFinite(pan) || pan < -1 || pan > 1) return { error: "声像应为-1到1", field: "pan" };
  if (!Number.isFinite(distance) || distance < 0.2 || distance > 3) return { error: "距离应为0.2到3", field: "distance" };
  if (!Number.isFinite(volume) || volume < 0 || volume > 100) return { error: "音量应为0到100", field: "volume" };
  if (description.length > 200) return { error: "说明不能超过200个字符", field: "description" };
  return { name: name, category: category, preset: preset, pan: pan, distance: distance, volume: volume, description: description };
}

function create(ctx) {
  const result = validate(ctx.body || {}, null);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  const row = Object.assign({
    id: store.id("AUD"),
    enabled: true,
    createdAt: store.now()
  }, result);
  store.db.audioAssets.push(row);
  store.save();
  audit.write(ctx.user, "音频", "新增素材", row.name, row.category, ctx.req);
  ctx.ok({ asset: row });
}

function update(ctx) {
  const row = store.db.audioAssets.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "音频素材不存在");
    return;
  }
  const result = validate(ctx.body || {}, row);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  Object.assign(row, result, { updatedAt: store.now() });
  store.save();
  audit.write(ctx.user, "音频", "修改素材", row.name, row.category, ctx.req);
  ctx.ok({ asset: row });
}

function toggle(ctx) {
  const row = store.db.audioAssets.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "音频素材不存在");
    return;
  }
  row.enabled = !row.enabled;
  row.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "音频", row.enabled ? "启用素材" : "停用素材", row.name, "", ctx.req);
  ctx.ok({ asset: row });
}

function remove(ctx) {
  const row = store.db.audioAssets.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "音频素材不存在");
    return;
  }
  const used = store.db.themes.some(function (theme) { return theme.audioPreset === row.id; });
  if (used) {
    ctx.fail(409, "该素材已被主题引用，只能停用");
    return;
  }
  store.db.audioAssets = store.db.audioAssets.filter(function (item) { return item.id !== row.id; });
  store.save();
  audit.write(ctx.user, "音频", "删除素材", row.name, "", ctx.req);
  ctx.ok({});
}

module.exports = {
  CATEGORIES: CATEGORIES,
  CATEGORY_NAMES: CATEGORY_NAMES,
  PRESETS: PRESETS,
  list: list,
  create: create,
  update: update,
  toggle: toggle,
  remove: remove
};
