const store = require("./store");
const auth = require("./auth");
const crypto = require("crypto");

function user(id, username, name, role, password) {
  const salt = auth.createSalt();
  return {
    id: id,
    username: username,
    name: name,
    role: role,
    email: username + "@school.local",
    status: "active",
    salt: salt,
    passwordHash: auth.hashPassword(password, salt),
    createdAt: "2026-06-05T08:00:00.000Z",
    lastLoginAt: ""
  };
}

function audio(id, name, category, preset, pan, distance, volume, description) {
  return {
    id: id,
    name: name,
    category: category,
    preset: preset,
    pan: pan,
    distance: distance,
    volume: volume,
    enabled: true,
    description: description,
    createdAt: "2026-06-05T08:00:00.000Z"
  };
}

function build(secret, dir) {
  const users = [
    user("USR-01", "admin01", "系统管理员", "ADMIN", "Admin@2026"),
    user("USR-02", "guide01", "咨询师/导览员", "GUIDE", "Guide@2026"),
    user("USR-03", "operator01", "现场运营", "OPERATOR", "Operator@2026")
  ];
  const audioAssets = [
    audio("AUD-01", "山林微风", "ambient", "wind", 0, 1, 35, "全局环境底噪，掩蔽环境杂音"),
    audio("AUD-02", "远处溪流", "ambient", "water", 0, 1, 28, "全局环境底噪，提供持续水声"),
    audio("AUD-03", "禅院空间底噪", "ambient", "room", 0, 1, 22, "室内混响底噪"),
    audio("AUD-04", "古琴泛音", "point", "guqin", -0.45, 0.6, 45, "山居主题点声源，位于画面左侧"),
    audio("AUD-05", "织布机律动", "point", "loom", 0.35, 0.5, 40, "工坊主题点声源，节奏明确"),
    audio("AUD-06", "方言轻声诵读", "point", "chant", 0.1, 0.8, 30, "专注达标后出现的文化锚点"),
    audio("AUD-07", "风铃", "point", "chime", -0.2, 0.4, 32, "山居场景远景声源"),
    audio("AUD-08", "铜铃交互", "interaction", "bell", 0, 0.2, 50, "凝视触发后的即时反馈"),
    audio("AUD-09", "木鱼轻击", "interaction", "wood", 0, 0.2, 42, "工坊互动点的短音效")
  ];
  const themes = [
    {
      id: "THEME-01",
      name: "山居静心",
      code: "mountain-zen",
      scene: "mountain",
      durationMin: 12,
      breathPattern: "4-7-8",
      audioPreset: "AUD-01",
      focusTargets: 4,
      description: "高山禅院场景，以古琴泛音与呼吸球引导放松",
      enabled: true,
      createdAt: "2026-06-05T08:00:00.000Z"
    },
    {
      id: "THEME-02",
      name: "匠心之境",
      code: "craft-focus",
      scene: "workshop",
      durationMin: 10,
      breathPattern: "4-7-8",
      audioPreset: "AUD-05",
      focusTargets: 5,
      description: "古镇工坊场景，以织布机律动与凝视目标训练专注",
      enabled: true,
      createdAt: "2026-06-05T08:00:00.000Z"
    }
  ];
  const participants = [
    { id: "PAR-01", code: "20260605-001", ageBand: "25-34", gender: "女", prePressure: 7, note: "首次体验，需轻声引导", status: "active", createdBy: "USR-02", createdAt: "2026-06-05T09:10:00.000Z" },
    { id: "PAR-02", code: "20260605-002", ageBand: "18-24", gender: "男", prePressure: 6, note: "", status: "active", createdBy: "USR-02", createdAt: "2026-06-05T09:40:00.000Z" },
    { id: "PAR-03", code: "20260605-003", ageBand: "35-44", gender: "女", prePressure: 8, note: "对强光敏感", status: "active", createdBy: "USR-03", createdAt: "2026-06-05T10:20:00.000Z" },
    { id: "PAR-04", code: "20260606-001", ageBand: "45-54", gender: "男", prePressure: 5, note: "", status: "active", createdBy: "USR-02", createdAt: "2026-06-06T09:00:00.000Z" },
    { id: "PAR-05", code: "20260606-002", ageBand: "18-24", gender: "女", prePressure: 9, note: "考试焦虑", status: "active", createdBy: "USR-03", createdAt: "2026-06-06T09:30:00.000Z" },
    { id: "PAR-06", code: "20260606-003", ageBand: "25-34", gender: "男", prePressure: 4, note: "", status: "archived", createdBy: "USR-02", createdAt: "2026-06-06T10:10:00.000Z" }
  ];
  const sessionBase = [
    { id: "SES-01", participantId: "PAR-01", themeId: "THEME-01", status: "completed", elapsedSec: 720, gazeHits: 9, breathCycles: 34, avgMotion: 21, reportId: "REP-01" },
    { id: "SES-02", participantId: "PAR-02", themeId: "THEME-02", status: "completed", elapsedSec: 600, gazeHits: 12, breathCycles: 25, avgMotion: 33, reportId: "REP-02" },
    { id: "SES-03", participantId: "PAR-03", themeId: "THEME-01", status: "completed", elapsedSec: 720, gazeHits: 7, breathCycles: 31, avgMotion: 27, reportId: "REP-03" },
    { id: "SES-04", participantId: "PAR-04", themeId: "THEME-02", status: "completed", elapsedSec: 600, gazeHits: 10, breathCycles: 22, avgMotion: 38, reportId: "REP-04" },
    { id: "SES-05", participantId: "PAR-05", themeId: "THEME-01", status: "aborted", elapsedSec: 210, gazeHits: 2, breathCycles: 8, avgMotion: 61, reportId: "" },
    { id: "SES-06", participantId: "PAR-06", themeId: "THEME-02", status: "prepared", elapsedSec: 0, gazeHits: 0, breathCycles: 0, avgMotion: 0, reportId: "" }
  ];
  const sessions = sessionBase.map(function (item) {
    const participant = participants.find(function (row) { return row.id === item.participantId; });
    const theme = themes.find(function (row) { return row.id === item.themeId; });
    return {
      id: item.id,
      participantId: item.participantId,
      participantCode: participant.code,
      themeId: item.themeId,
      themeName: theme.name,
      scene: theme.scene,
      durationMin: theme.durationMin,
      breathPattern: "4-7-8",
      audioPreset: theme.audioPreset,
      focusTargets: theme.focusTargets,
      status: item.status,
      token: crypto.randomBytes(16).toString("hex"),
      tokenExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      control: { volume: 50, brightness: 60, message: "" },
      command: "",
      startedAt: item.status === "prepared" ? "" : "2026-06-05T09:20:00.000Z",
      endedAt: item.status === "prepared" ? "" : "2026-06-05T09:32:00.000Z",
      elapsedSec: item.elapsedSec,
      metrics: {
        gazeHits: item.gazeHits,
        breathCycles: item.breathCycles,
        avgMotion: item.avgMotion,
        motionIndex: item.avgMotion,
        focusScore: Math.max(40, 100 - item.avgMotion),
        relaxScore: Math.max(40, 100 - item.avgMotion + item.breathCycles),
        completion: Math.min(100, Math.round(item.breathCycles * 19 / Math.max(1, item.elapsedSec) * 100))
      },
      samples: [],
      events: item.status === "prepared" ? [] : [{ time: "2026-06-05T09:20:00.000Z", type: "start", message: "体验开始" }, { time: "2026-06-05T09:32:00.000Z", type: "end", message: "体验结束" }],
      reportId: item.reportId,
      createdBy: "USR-02",
      createdByName: "咨询师/导览员",
      createdAt: "2026-06-05T09:15:00.000Z"
    };
  });
  const reports = [
    { id: "REP-01", sessionId: "SES-01", participantCode: "20260605-001", themeName: "山居静心", durationSec: 720, gazeHits: 9, breathCycles: 34, avgMotion: 21, focusScore: 88, relaxScore: 100, completion: 90, overall: 93, conclusion: "呼吸节律稳定，视角移动较少，放松状态良好。", advice: "可延长至15分钟，保持古琴点声源音量。", createdAt: "2026-06-05T09:33:00.000Z" },
    { id: "REP-02", sessionId: "SES-02", participantCode: "20260605-002", themeName: "匠心之境", durationSec: 600, gazeHits: 12, breathCycles: 25, avgMotion: 33, focusScore: 78, relaxScore: 76, completion: 79, overall: 78, conclusion: "整体平稳，仍有一定视角波动，可通过延长屏气阶段改善。", advice: "缩短单次时长，先做一次山居静心。", createdAt: "2026-06-05T09:50:00.000Z" },
    { id: "REP-03", sessionId: "SES-03", participantCode: "20260605-003", themeName: "山居静心", durationSec: 720, gazeHits: 7, breathCycles: 31, avgMotion: 27, focusScore: 78, relaxScore: 91, completion: 82, overall: 84, conclusion: "整体平稳，仍有一定视角波动，可通过延长屏气阶段改善。", advice: "下次降低亮度并保留水墨场景。", createdAt: "2026-06-05T10:05:00.000Z" },
    { id: "REP-04", sessionId: "SES-04", participantCode: "20260606-001", themeName: "匠心之境", durationSec: 600, gazeHits: 10, breathCycles: 22, avgMotion: 38, focusScore: 69, relaxScore: 65, completion: 70, overall: 68, conclusion: "完成主要流程，专注与放松仍有提升空间。", advice: "先进行呼吸练习，再进入工坊主题。", createdAt: "2026-06-06T09:15:00.000Z" }
  ];
  sessions.forEach(function (session) {
    const report = reports.find(function (item) { return item.sessionId === session.id; });
    if (report) {
      session.metrics.focusScore = report.focusScore;
      session.metrics.relaxScore = report.relaxScore;
      session.metrics.completion = report.completion;
      session.metrics.overall = report.overall;
    }
  });
  const feedback = [
    { id: "FB-01", userId: "USR-02", type: "建议", content: "希望增加体验时长自定义范围。", status: "replied", reply: "已记录，后续版本评估。", createdAt: "2026-06-05T11:00:00.000Z", repliedAt: "2026-06-05T11:30:00.000Z" },
    { id: "FB-02", userId: "USR-03", type: "问题", content: "体验端打开后没有声音，检查音量设置。", status: "closed", reply: "浏览器需先点击开始体验以启用音频。", createdAt: "2026-06-06T10:00:00.000Z", repliedAt: "2026-06-06T10:10:00.000Z" }
  ];
  const auditLogs = [
    { id: "LOG-01", userId: "USR-02", username: "guide01", role: "GUIDE", category: "会话", action: "创建会话", target: "SES-01", detail: "山居静心", ip: "127.0.0.1", createdAt: "2026-06-05T09:15:00.000Z" },
    { id: "LOG-02", userId: "USR-02", username: "guide01", role: "GUIDE", category: "会话", action: "完成会话", target: "SES-01", detail: "720秒", ip: "127.0.0.1", createdAt: "2026-06-05T09:32:00.000Z" }
  ];
  return {
    meta: { createdAt: "2026-06-05T08:00:00.000Z", version: 1 },
    users: users,
    tokens: [],
    participants: participants,
    themes: themes,
    audioAssets: audioAssets,
    sessions: sessions,
    reports: reports,
    feedback: feedback,
    auditLogs: auditLogs,
    settings: {
      softwareName: "沉浸式非遗音景疗愈虚拟现实体验软件",
      softwareVersion: "V1.0.0",
      defaultDuration: 12,
      defaultVolume: 50,
      defaultBrightness: 60,
      aiNotice: "本软件生成的场景与音景由本地程序合成，体验记录保存在本机。",
      roleMenus: {
        ADMIN: ["dashboard", "participants", "themes", "sessions", "reports", "audio", "users", "audit", "settings", "feedback", "profile", "help"],
        GUIDE: ["dashboard", "participants", "themes", "sessions", "reports", "audio", "feedback", "profile", "help"],
        OPERATOR: ["dashboard", "participants", "sessions", "reports", "audio", "feedback", "profile", "help"]
      }
    }
  };
}

module.exports = { build: build };
