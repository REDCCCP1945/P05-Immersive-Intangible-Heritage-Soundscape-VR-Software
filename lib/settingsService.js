const store = require("./store");
const audit = require("./audit");
const userService = require("./userService");

function get(ctx) {
  ctx.ok({
    settings: store.db.settings,
    roleMenus: store.db.settings.roleMenus,
    roleNames: userService.ROLE_NAMES
  });
}

function save(ctx) {
  const body = ctx.body || {};
  const settings = store.db.settings;
  const numeric = {
    defaultDuration: [5, 30],
    defaultVolume: [0, 100],
    defaultBrightness: [0, 100]
  };
  for (const key of Object.keys(numeric)) {
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < numeric[key][0] || value > numeric[key][1]) {
      ctx.fail(400, key + " 应在 " + numeric[key][0] + " 到 " + numeric[key][1] + " 之间", key);
      return;
    }
    settings[key] = Math.round(value);
  }
  if (typeof body.aiNotice === "string" && body.aiNotice.trim()) settings.aiNotice = body.aiNotice.trim().slice(0, 300);
  store.save();
  audit.write(ctx.user, "系统设置", "保存默认参数", "体验参数", "时长" + settings.defaultDuration + "分钟，音量" + settings.defaultVolume, ctx.req);
  ctx.ok({ settings: settings });
}

function roleMenu(ctx) {
  ctx.ok({ roleMenus: store.db.settings.roleMenus, roleNames: userService.ROLE_NAMES });
}

function roleMenuSave(ctx) {
  const body = ctx.body || {};
  const role = String(body.role || "");
  const menus = Array.isArray(body.menus) ? body.menus.slice() : null;
  if (!userService.ROLE_NAMES[role]) {
    ctx.fail(400, "角色无效", "role");
    return;
  }
  if (!menus) {
    ctx.fail(400, "菜单列表无效", "menus");
    return;
  }
  if (role === "ADMIN") {
    ctx.fail(409, "内置管理员菜单不能修改");
    return;
  }
  store.db.settings.roleMenus[role] = menus;
  store.save();
  audit.write(ctx.user, "权限", "调整角色菜单", userService.ROLE_NAMES[role], menus.join("、"), ctx.req);
  ctx.ok({ roleMenus: store.db.settings.roleMenus });
}

module.exports = {
  get: get,
  save: save,
  roleMenu: roleMenu,
  roleMenuSave: roleMenuSave
};
