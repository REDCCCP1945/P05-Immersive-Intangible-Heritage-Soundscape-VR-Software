const ReportsView = {
  state: { page: 1, size: 10, keyword: "" },
  render: async function (container) {
    async function load() {
      const data = (await API.get("/api/reports?page=" + ReportsView.state.page + "&size=" + ReportsView.state.size + "&keyword=" + encodeURIComponent(ReportsView.state.keyword))).data;
      container.innerHTML = UI.pageHead("体验报告", "基于会话指标自动生成，评分公式固定可复算") +
        '<div class="kpi-grid">' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.total) + '</strong><span>报告总数</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.good) + '</strong><span>综合分≥80</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.average) + '</strong><span>平均综合分</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.aborted) + '</strong><span>中止记录</span></div>' +
        '</div>' +
        '<div class="card"><div class="card-body"><div class="filter-bar"><input class="input" id="r-keyword" placeholder="体验者编码、主题或结论" value="' + UI.esc(ReportsView.state.keyword) + '"><button class="btn" id="r-search">查询</button></div>' +
        UI.table({
          columns: [
            { title: "报告", key: "id", render: function (row) { return '<a href="#/reports/' + UI.esc(row.id) + '">' + UI.esc(row.id) + "</a>"; } },
            { title: "体验者", key: "participantCode" },
            { title: "主题", key: "themeName" },
            { title: "时长", key: "durationSec", render: function (row) { return Math.round(row.durationSec / 60) + " 分钟"; } },
            { title: "专注", key: "focusScore", align: "right" },
            { title: "放松", key: "relaxScore", align: "right" },
            { title: "综合", key: "overall", align: "right" },
            { title: "结论", key: "conclusion" },
            { title: "生成时间", key: "createdAt", render: function (row) { return UI.fmtDateTime(row.createdAt); } }
          ],
          rows: data.rows,
          empty: "暂无报告"
        }) + UI.pagination(data, function () {}) + '</div></div>';
      UI.bindPagination(container, ReportsView.state, load);
      container.querySelector("#r-search").addEventListener("click", function () {
        ReportsView.state.keyword = container.querySelector("#r-keyword").value.trim();
        ReportsView.state.page = 1;
        load();
      });
    }
    await load();
  }
};
App.register("reports", ReportsView);
