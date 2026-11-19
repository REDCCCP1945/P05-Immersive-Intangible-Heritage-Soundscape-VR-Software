const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const store = require("./lib/store");
const auth = require("./lib/auth");
const audit = require("./lib/audit");
const httpUtil = require("./lib/http");
const dashboard = require("./lib/dashboardService");
const participantService = require("./lib/participantService");
const themeService = require("./lib/themeService");
const audioService = require("./lib/audioService");
const sessionService = require("./lib/sessionService");
const reportService = require("./lib/reportService");
const userService = require("./lib/userService");
const settingsService = require("./lib/settingsService");
const feedbackService = require("./lib/feedbackService");

const PORT = Number(process.env.PORT || 4105);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");

store.init(DATA_DIR);

const ALL = ["ADMIN", "GUIDE", "OPERATOR"];
const ADMIN = ["ADMIN"];
const STAFF = ["ADMIN", "GUIDE", "OPERATOR"];
const writeHits = new Map();
const routes = [];

function route(method, pattern, roles, handler) {
  routes.push({ method: method, pattern: pattern, roles: roles, handler: handler });
}

route("POST", /^\/api\/auth\/login$/, [], auth.login);
route("POST", /^\/api\/auth\/logout$/, ALL, auth.logout);
route("GET", /^\/api\/auth\/me$/, ALL, auth.me);
route("POST", /^\/api\/auth\/password$/, ALL, auth.changePassword);

route("GET", /^\/api\/meta$/, [], function (ctx) {
  ctx.ok({
    name: store.db.settings.softwareName,
    version: store.db.settings.softwareVersion,
    owner: "陕西理工大学",
    contact: "李果",
    aiNotice: store.db.settings.aiNotice,
    dataPolicy: "软件不访问互联网，不上传体验数据；所有记录保存在本机data目录。",
    defaults: {
      duration: store.db.settings.defaultDuration,
      volume: store.db.settings.defaultVolume,
      brightness: store.db.settings.defaultBrightness
    },
    serverTime: new Date().toISOString()
  });
});

route("GET", /^\/api\/dashboard$/, ALL, dashboard.summary);

route("GET", /^\/api\/participants$/, ALL, participantService.list);
route("POST", /^\/api\/participants$/, STAFF, participantService.create);
route("GET", /^\/api\/participants\/([^/]+)$/, ALL, participantService.detail);
route("PUT", /^\/api\/participants\/([^/]+)$/, STAFF, participantService.update);
route("POST", /^\/api\/participants\/([^/]+)\/archive$/, ["ADMIN", "GUIDE"], participantService.archive);

route("GET", /^\/api\/themes$/, ALL, themeService.list);
route("POST", /^\/api\/themes$/, ADMIN, themeService.create);
route("GET", /^\/api\/themes\/([^/]+)$/, ALL, themeService.detail);
route("PUT", /^\/api\/themes\/([^/]+)$/, ADMIN, themeService.update);
route("POST", /^\/api\/themes\/([^/]+)\/toggle$/, ADMIN, themeService.toggle);
route("DELETE", /^\/api\/themes\/([^/]+)$/, ADMIN, themeService.remove);

route("GET", /^\/api\/audio$/, ALL, audioService.list);
route("POST", /^\/api\/audio$/, ADMIN, audioService.create);
route("PUT", /^\/api\/audio\/([^/]+)$/, ADMIN, audioService.update);
route("POST", /^\/api\/audio\/([^/]+)\/toggle$/, ADMIN, audioService.toggle);
route("DELETE", /^\/api\/audio\/([^/]+)$/, ADMIN, audioService.remove);

route("GET", /^\/api\/sessions$/, ALL, sessionService.list);
route("POST", /^\/api\/sessions$/, STAFF, sessionService.create);
route("GET", /^\/api\/sessions\/([^/]+)$/, ALL, sessionService.detail);
route("POST", /^\/api\/sessions\/([^/]+)\/start$/, STAFF, sessionService.start);
route("POST", /^\/api\/sessions\/([^/]+)\/pause$/, STAFF, sessionService.pause);
route("POST", /^\/api\/sessions\/([^/]+)\/resume$/, STAFF, sessionService.resume);
route("POST", /^\/api\/sessions\/([^/]+)\/stop$/, STAFF, sessionService.stop);
route("POST", /^\/api\/sessions\/([^/]+)\/abort$/, STAFF, sessionService.abort);
route("POST", /^\/api\/sessions\/([^/]+)\/control$/, STAFF, sessionService.control);

route("GET", /^\/api\/experience\/([^/]+)\/state$/, [], sessionService.stateByToken);
route("POST", /^\/api\/experience\/([^/]+)\/begin$/, [], sessionService.beginByToken);
route("POST", /^\/api\/experience\/([^/]+)\/metrics$/, [], sessionService.metricsByToken);
route("POST", /^\/api\/experience\/([^/]+)\/event$/, [], sessionService.eventByToken);
route("POST", /^\/api\/experience\/([^/]+)\/complete$/, [], sessionService.completeByToken);
route("POST", /^\/api\/experience\/([^/]+)\/ack$/, [], sessionService.ackByToken);

route("GET", /^\/api\/reports$/, ALL, reportService.list);
route("GET", /^\/api\/reports\/([^/]+)$/, ALL, reportService.detail);
route("GET", /^\/api\/reports\/([^/]+)\/export\/json$/, ALL, reportService.exportJson);
route("GET", /^\/api\/reports\/([^/]+)\/export\/csv$/, ALL, reportService.exportCsv);

route("GET", /^\/api\/users\/backup$/, ADMIN, userService.exportBackup);
route("GET", /^\/api\/users$/, ADMIN, userService.list);
route("POST", /^\/api\/users$/, ADMIN, userService.create);
route("POST", /^\/api\/users\/([^/]+)\/toggle$/, ADMIN, userService.toggle);
route("POST", /^\/api\/users\/([^/]+)\/reset$/, ADMIN, userService.resetPassword);
route("POST", /^\/api\/users\/([^/]+)\/role$/, ADMIN, userService.changeRole);
route("GET", /^\/api\/profile$/, ALL, userService.profile);
route("POST", /^\/api\/profile$/, ALL, userService.updateProfile);

route("GET", /^\/api\/settings\/roles$/, ADMIN, settingsService.roleMenu);
route("POST", /^\/api\/settings\/roles$/, ADMIN, settingsService.roleMenuSave);
route("GET", /^\/api\/settings$/, ADMIN, settingsService.get);
route("POST", /^\/api\/settings$/, ADMIN, settingsService.save);

route("GET", /^\/api\/logs$/, ADMIN, audit.list);

route("GET", /^\/api\/feedback$/, ALL, feedbackService.list);
route("POST", /^\/api\/feedback$/, ALL, feedbackService.create);
route("POST", /^\/api\/feedback\/([^/]+)\/reply$/, ADMIN, feedbackService.reply);
route("POST", /^\/api\/feedback\/([^/]+)\/close$/, ALL, feedbackService.close);

function matchRoute(method, pathname) {
  for (const item of routes) {
    if (item.method !== method) continue;
    const matched = item.pattern.exec(pathname);
    if (matched) return { def: item, params: matched.slice(1) };
  }
  return null;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(PUBLIC_DIR, safe);
  if (!file.startsWith(PUBLIC_DIR)) {
    httpUtil.sendJson(res, 403, { code: 403, message: "禁止访问" });
    return;
  }
  fs.stat(file, function (err, stat) {
    if (err || !stat.isFile()) {
      httpUtil.sendJson(res, 404, { code: 404, message: "资源不存在" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "public, max-age=120"
    });
    fs.createReadStream(file).pipe(res);
  });
}

function checkRate(user) {
  if (!user) return true;
  const minute = Math.floor(Date.now() / 60000);
  const key = user.id + ":" + minute;
  const count = (writeHits.get(key) || 0) + 1;
  writeHits.set(key, count);
  if (writeHits.size > 500) {
    writeHits.forEach(function (value, item) {
      const stamp = Number(item.split(":")[1]);
      if (stamp < minute - 2) writeHits.delete(item);
    });
  }
  return count <= 60;
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, "http://" + (req.headers.host || "127.0.0.1"));
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.indexOf("/api/") !== 0) {
    serveStatic(req, res, pathname);
    return;
  }
  const matched = matchRoute(req.method, pathname);
  if (!matched) {
    httpUtil.sendJson(res, 404, { code: 404, message: "接口不存在" });
    return;
  }
  httpUtil.readBody(req, 1024 * 1024, function (err, body) {
    if (err) {
      httpUtil.sendJson(res, 413, { code: 413, message: "请求内容过大" });
      return;
    }
    let user = null;
    try {
      user = auth.fromRequest(req);
    } catch (e) {
      user = null;
    }
    if (matched.def.roles.length > 0) {
      if (!user) {
        httpUtil.sendJson(res, 401, { code: 401, message: "登录状态已失效，请重新登录" });
        return;
      }
      if (matched.def.roles.indexOf(user.role) < 0) {
        audit.write(user, "权限", "拒绝访问", pathname, "角色" + user.role + "无权访问", req);
        httpUtil.sendJson(res, 403, { code: 403, message: "当前角色无权执行该操作" });
        return;
      }
    }
    if (req.method !== "GET" && pathname !== "/api/auth/login" && pathname.indexOf("/api/experience/") !== 0 && !checkRate(user)) {
      httpUtil.sendJson(res, 429, { code: 429, message: "操作过于频繁，请稍后再试" });
      return;
    }
    let payload = {};
    try {
      payload = httpUtil.parseJson(body);
    } catch (e) {
      httpUtil.sendJson(res, 400, { code: 400, message: "请求内容不是合法JSON" });
      return;
    }
    const ctx = {
      req: req,
      res: res,
      user: user,
      params: matched.params,
      query: url.searchParams,
      body: payload,
      send: function (code, data) {
        httpUtil.sendJson(res, code, data);
      },
      ok: function (data) {
        httpUtil.sendJson(res, 200, { code: 0, message: "操作成功", data: data || {} });
      },
      fail: function (code, message, field) {
        httpUtil.sendJson(res, code, { code: code, message: message, field: field || null });
      }
    };
    try {
      matched.def.handler(ctx);
    } catch (error) {
      console.error(error);
      httpUtil.sendJson(res, 500, { code: 500, message: "服务器处理失败" });
    }
  });
});

server.listen(PORT, "127.0.0.1", function () {
  console.log("沉浸式非遗音景疗愈虚拟现实体验软件V1.0.0");
  console.log("服务已启动：http://127.0.0.1:" + PORT);
  console.log("数据文件：" + path.join(DATA_DIR, "db.json"));
});
