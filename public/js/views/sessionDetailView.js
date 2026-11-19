const SessionDetailView = {
  render: async function (container, params) {
    const data = (await API.get("/api/sessions/" + params.id)).data;
    const session = data.session;
    const summary = data.summary;
    container.innerHTML = UI.pageHead("会话详情 " + session.id, session.participantCode + " · " + session.themeName,
      '<a class="btn" href="#/sessions">返回列表</a><a class="btn" href="#/session/' + UI.esc(session.id) + '">进入播控台</a>' +
      (session.reportId ? '<a class="btn primary" href="#/reports/' + UI.esc(session.reportId) + '">查看报告</a>' : "")) +
      '<div class="kpi-grid">' +
      '<div class="kpi"><strong>' + summary.gazeHits + '</strong><span>凝视命中</span></div>' +
      '<div class="kpi"><strong>' + summary.breathCycles + '</strong><span>呼吸周期</span></div>' +
      '<div class="kpi"><strong>' + summary.avgMotion + '</strong><span>平均移动</span></div>' +
      '<div class="kpi"><strong>' + summary.focusScore + '</strong><span>专注分</span></div>' +
      '<div class="kpi"><strong>' + summary.relaxScore + '</strong><span>放松分</span></div>' +
      '<div class="kpi"><strong>' + summary.completion + '</strong><span>完成度</span></div>' +
      '</div>' +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>会话信息</h3><span>' + UI.statusBadge(session.status) + '</span></div><div class="card-body">' +
      '<table class="info-table"><tbody>' +
      '<tr><td>体验者编码</td><td>' + UI.esc(session.participantCode) + '</td></tr>' +
      '<tr><td>主题</td><td>' + UI.esc(session.themeName) + '</td></tr>' +
      '<tr><td>场景</td><td>' + (session.scene === "mountain" ? "山居禅院" : "古镇工坊") + '</td></tr>' +
      '<tr><td>计划时长</td><td>' + session.durationMin + ' 分钟</td></tr>' +
      '<tr><td>已进行</td><td>' + Math.floor(session.elapsedSec / 60) + ' 分 ' + (session.elapsedSec % 60) + ' 秒</td></tr>' +
      '<tr><td>开始时间</td><td>' + (session.startedAt ? UI.fmtDateTime(session.startedAt) : "—") + '</td></tr>' +
      '<tr><td>结束时间</td><td>' + (session.endedAt ? UI.fmtDateTime(session.endedAt) : "—") + '</td></tr>' +
      '<tr><td>创建人</td><td>' + UI.esc(session.createdByName) + '</td></tr>' +
      '</tbody></table></div></div>' +
      '<div class="card"><div class="card-head"><h3>评分</h3><span class="muted">固定权重</span></div><div class="card-body">' +
      Charts.hbars([
        { name: "专注分", value: summary.focusScore },
        { name: "放松分", value: summary.relaxScore },
        { name: "完成度", value: summary.completion },
        { name: "综合分", value: summary.overall }
      ]) + '</div></div></div>' +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>采样序列</h3><span class="muted">每5秒一条</span></div><div class="card-body">' +
      UI.table({
        columns: [
          { title: "秒", key: "at", align: "right" },
          { title: "移动指数", key: "motionIndex", align: "right" },
          { title: "凝视", key: "gazeHits", align: "right" },
          { title: "呼吸周期", key: "breathCycles", align: "right" },
          { title: "阶段", key: "phase" }
        ],
        rows: session.samples || [],
        empty: "暂无采样"
      }) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>事件时间线</h3><span class="muted">' + session.events.length + ' 条</span></div><div class="card-body timeline">' +
      session.events.slice().reverse().map(function (item) {
        return '<div class="timeline-item"><time>' + UI.fmtDateTime(item.time) + '</time><strong>' + UI.esc(item.type) + '</strong><p>' + UI.esc(item.message) + '</p></div>';
      }).join("") + '</div></div></div>';
  }
};
App.register("session-detail", SessionDetailView);
