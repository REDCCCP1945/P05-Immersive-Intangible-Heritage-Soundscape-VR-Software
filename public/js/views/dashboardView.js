const DashboardView = {
  render: async function (container) {
    const data = (await API.get("/api/dashboard")).data;
    const statusItems = [
      { name: "已准备", value: data.statusCounts.prepared, color: "#8b9aab" },
      { name: "体验中", value: data.statusCounts.running, color: "#4c8dff" },
      { name: "已暂停", value: data.statusCounts.paused, color: "#e0a43a" },
      { name: "已完成", value: data.statusCounts.completed, color: "#27d3c0" },
      { name: "已中止", value: data.statusCounts.aborted, color: "#ef6b6b" }
    ];
    container.innerHTML = UI.pageHead("工作台", "体验、报告与音景素材的实时概览", '<button class="btn primary" id="quick-session">新建体验会话</button>') +
      '<div class="kpi-grid">' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.participantCount) + '</strong><span>体验者总数</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.sessionCount) + '</strong><span>体验会话</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.reportCount) + '</strong><span>体验报告</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.avgOverall) + '</strong><span>平均综合分</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.activeParticipants) + '</strong><span>在册体验者</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.pendingFeedback) + '</strong><span>待处理反馈</span></div>' +
      '</div>' +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>会话状态</h3><span class="muted">当前全部会话</span></div><div class="card-body">' + Charts.donut(statusItems) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>近七日趋势</h3><span class="muted">会话与报告</span></div><div class="card-body">' +
      data.trend.map(function (item) {
        return '<div class="trend-row"><span>' + UI.esc(item.date) + '</span><div class="trend-bars"><i style="width:' + Math.min(100, item.sessions * 12 + 4) + '%"></i><b style="width:' + Math.min(100, item.reports * 12 + 4) + '%"></b></div><span>' + item.sessions + " / " + item.reports + "</span></div>";
      }).join("") + '</div></div></div>' +
      '<div class="card"><div class="card-head"><h3>最近会话</h3><a href="#/sessions">查看全部</a></div><div class="card-body">' +
      UI.table({
        columns: [
          { title: "会话", key: "id", render: function (row) { return '<a href="#/session/' + UI.esc(row.id) + '">' + UI.esc(row.id) + "</a>"; } },
          { title: "体验者", key: "participantCode" },
          { title: "主题", key: "themeName" },
          { title: "状态", key: "status", render: function (row) { return UI.statusBadge(row.status); } },
          { title: "综合分", key: "overall", align: "right" },
          { title: "时间", key: "createdAt", render: function (row) { return UI.fmtDateTime(row.createdAt); } }
        ],
        rows: data.recentSessions,
        empty: "暂无会话"
      }) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>最近报告</h3><a href="#/reports">查看全部</a></div><div class="card-body">' +
      UI.table({
        columns: [
          { title: "报告", key: "id", render: function (row) { return '<a href="#/reports/' + UI.esc(row.id) + '">' + UI.esc(row.id) + "</a>"; } },
          { title: "体验者", key: "participantCode" },
          { title: "主题", key: "themeName" },
          { title: "专注", key: "focusScore", align: "right" },
          { title: "放松", key: "relaxScore", align: "right" },
          { title: "综合", key: "overall", align: "right" }
        ],
        rows: data.recentReports,
        empty: "暂无报告"
      }) + '</div></div>';
    container.querySelector("#quick-session").addEventListener("click", function () { location.hash = "#/sessions"; });
  }
};
App.register("dashboard", DashboardView);
