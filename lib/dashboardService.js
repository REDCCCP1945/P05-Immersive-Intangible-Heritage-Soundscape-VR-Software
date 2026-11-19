const store = require("./store");

function summary(ctx) {
  const sessions = store.db.sessions;
  const reports = store.db.reports;
  const completed = sessions.filter(function (item) { return item.status === "completed"; });
  const avgOverall = reports.length ? Math.round(reports.reduce(function (sum, item) { return sum + Number(item.overall || 0); }, 0) / reports.length) : 0;
  const trend = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    trend.push({
      date: day.slice(5),
      sessions: sessions.filter(function (item) { return String(item.createdAt).slice(0, 10) === day; }).length,
      reports: reports.filter(function (item) { return String(item.createdAt).slice(0, 10) === day; }).length
    });
  }
  ctx.ok({
    participantCount: store.db.participants.length,
    activeParticipants: store.db.participants.filter(function (item) { return item.status === "active"; }).length,
    sessionCount: sessions.length,
    completedSessions: completed.length,
    reportCount: reports.length,
    avgOverall: avgOverall,
    pendingFeedback: store.db.feedback.filter(function (item) { return item.status === "pending"; }).length,
    statusCounts: {
      prepared: sessions.filter(function (item) { return item.status === "prepared"; }).length,
      running: sessions.filter(function (item) { return item.status === "running"; }).length,
      paused: sessions.filter(function (item) { return item.status === "paused"; }).length,
      completed: completed.length,
      aborted: sessions.filter(function (item) { return item.status === "aborted"; }).length
    },
    recentSessions: sessions.slice(0, 6).map(function (item) {
      return {
        id: item.id,
        participantCode: item.participantCode,
        themeName: item.themeName,
        status: item.status,
        elapsedSec: item.elapsedSec,
        overall: item.metrics.overall,
        createdAt: item.createdAt
      };
    }),
    recentReports: reports.slice(0, 5),
    trend: trend
  });
}

module.exports = { summary: summary };
