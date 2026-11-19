const ReportDetailView = {
  render: async function (container, params) {
    const data = (await API.get("/api/reports/" + params.id)).data;
    const report = data.report;
    container.innerHTML = UI.pageHead("体验报告 " + report.id, report.participantCode + " · " + report.themeName,
      '<a class="btn" href="#/reports">返回列表</a><button class="btn" id="export-json">导出JSON</button><button class="btn primary" id="export-csv">导出CSV</button>') +
      '<div class="kpi-grid">' +
      '<div class="kpi"><strong>' + report.focusScore + '</strong><span>专注分</span></div>' +
      '<div class="kpi"><strong>' + report.relaxScore + '</strong><span>放松分</span></div>' +
      '<div class="kpi"><strong>' + report.completion + '</strong><span>完成度</span></div>' +
      '<div class="kpi"><strong>' + report.overall + '</strong><span>综合分</span></div>' +
      '<div class="kpi"><strong>' + report.gazeHits + '</strong><span>凝视命中</span></div>' +
      '<div class="kpi"><strong>' + report.breathCycles + '</strong><span>呼吸周期</span></div>' +
      '</div>' +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>指标与评分</h3><span>' + UI.statusBadge(report.status) + '</span></div><div class="card-body">' +
      Charts.hbars([
        { name: "专注分", value: report.focusScore },
        { name: "放松分", value: report.relaxScore },
        { name: "完成度", value: report.completion },
        { name: "综合分", value: report.overall }
      ]) +
      '<table class="info-table" style="margin-top:18px"><tbody>' +
      '<tr><td>体验时长</td><td>' + Math.round(report.durationSec / 60) + ' 分钟</td></tr>' +
      '<tr><td>平均移动指数</td><td>' + report.avgMotion + '</td></tr>' +
      '<tr><td>生成时间</td><td>' + UI.fmtDateTime(report.createdAt) + '</td></tr>' +
      '<tr><td>关联会话</td><td><a href="#/session-detail/' + UI.esc(report.sessionId) + '">' + UI.esc(report.sessionId) + '</a></td></tr>' +
      '</tbody></table></div></div>' +
      '<div class="card"><div class="card-head"><h3>结论与建议</h3><span class="muted">固定公式生成</span></div><div class="card-body">' +
      '<div class="report-block"><h4>结论</h4><p>' + UI.esc(report.conclusion) + '</p></div>' +
      '<div class="report-block"><h4>建议</h4><p>' + UI.esc(report.advice) + '</p></div>' +
      '<div class="note-box">综合分 = 专注分×0.4 + 放松分×0.35 + 完成度×0.25。完成度 = 呼吸周期×19秒 ÷ 体验时长。分数保留整数，不随展示变化。</div>' +
      '</div></div></div>';
    container.querySelector("#export-json").addEventListener("click", async function () {
      const result = (await API.get("/api/reports/" + report.id + "/export/json")).data;
      UI.downloadText(result.filename, result.content, result.type);
    });
    container.querySelector("#export-csv").addEventListener("click", async function () {
      const result = (await API.get("/api/reports/" + report.id + "/export/csv")).data;
      UI.downloadText(result.filename, result.content, result.type);
    });
  }
};
App.register("report-detail", ReportDetailView);
