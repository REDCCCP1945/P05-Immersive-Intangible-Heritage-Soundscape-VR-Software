const SessionsView = {
  state: { page: 1, size: 10, status: "", themeId: "", keyword: "" },
  render: async function (container) {
    const participants = (await API.get("/api/participants?status=active&size=50")).data.rows;
    const themes = (await API.get("/api/themes")).data.rows.filter(function (item) { return item.enabled; });
    async function load() {
      const query = "?page=" + SessionsView.state.page + "&size=" + SessionsView.state.size +
        "&status=" + encodeURIComponent(SessionsView.state.status) + "&themeId=" + encodeURIComponent(SessionsView.state.themeId) +
        "&keyword=" + encodeURIComponent(SessionsView.state.keyword);
      const data = (await API.get("/api/sessions" + query)).data;
      container.innerHTML = UI.pageHead("会话与播控", "创建体验会话、进入播控台、查看实时指标", '<button class="btn primary" id="session-add">新建体验会话</button>') +
        '<div class="kpi-grid">' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.total) + '</strong><span>全部会话</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.prepared) + '</strong><span>已准备</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.running) + '</strong><span>体验中</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.completed) + '</strong><span>已完成</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.aborted) + '</strong><span>已中止</span></div>' +
        '</div>' +
        '<div class="card"><div class="card-body"><div class="filter-bar">' +
        '<input class="input" id="s-keyword" placeholder="体验者编码或主题" value="' + UI.esc(SessionsView.state.keyword) + '">' +
        '<select class="input" id="s-status"><option value="">全部状态</option>' + ["prepared", "running", "paused", "completed", "aborted"].map(function (key) {
          return '<option value="' + key + '"' + (SessionsView.state.status === key ? " selected" : "") + ">" + UI.statusBadge(key).replace(/<[^>]+>/g, "") + "</option>";
        }).join("") + '</select>' +
        '<select class="input" id="s-theme"><option value="">全部主题</option>' + themes.map(function (theme) {
          return '<option value="' + UI.esc(theme.id) + '"' + (SessionsView.state.themeId === theme.id ? " selected" : "") + ">" + UI.esc(theme.name) + "</option>";
        }).join("") + '</select>' +
        '<button class="btn" id="s-search">查询</button></div>' +
        UI.table({
          columns: [
            { title: "会话", key: "id", render: function (row) { return '<a href="#/session/' + UI.esc(row.id) + '">' + UI.esc(row.id) + "</a>"; } },
            { title: "体验者", key: "participantCode" },
            { title: "主题", key: "themeName" },
            { title: "状态", key: "status", render: function (row) { return UI.statusBadge(row.status); } },
            { title: "时长", key: "elapsedSec", render: function (row) { return Math.floor(row.elapsedSec / 60) + ":" + String(row.elapsedSec % 60).padStart(2, "0"); } },
            { title: "凝视", key: "summary", render: function (row) { return row.summary.gazeHits; }, align: "right" },
            { title: "综合分", key: "summary", render: function (row) { return row.summary.overall; }, align: "right" },
            { title: "创建时间", key: "createdAt", render: function (row) { return UI.fmtDateTime(row.createdAt); } },
            { title: "操作", key: "id", render: function (row) {
              return '<a class="link" href="#/session/' + UI.esc(row.id) + '">播控台</a><a class="link" href="#/session-detail/' + UI.esc(row.id) + '">详情</a>';
            } }
          ],
          rows: data.rows,
          empty: "暂无会话"
        }) + UI.pagination(data, function () {}) + '</div></div>';
      UI.bindPagination(container, SessionsView.state, load);
      container.querySelector("#s-search").addEventListener("click", function () {
        SessionsView.state.keyword = container.querySelector("#s-keyword").value.trim();
        SessionsView.state.status = container.querySelector("#s-status").value;
        SessionsView.state.themeId = container.querySelector("#s-theme").value;
        SessionsView.state.page = 1;
        load();
      });
      container.querySelector("#session-add").addEventListener("click", function () { SessionsView.openCreate(participants, themes, load); });
    }
    await load();
  },
  openCreate: function (participants, themes, done) {
    const body = '<form id="session-form"><div class="form-grid">' +
      '<div class="field"><label>体验者</label><select class="input" name="participantId">' + UI.optionList(participants.map(function (item) { return { value: item.id, label: item.code + "（" + item.ageBand + "）" }; }), participants[0] ? participants[0].id : "") + '</select></div>' +
      '<div class="field"><label>疗愈主题</label><select class="input" name="themeId">' + UI.optionList(themes.map(function (item) { return { value: item.id, label: item.name + " · " + item.durationMin + "分钟" }; }), themes[0] ? themes[0].id : "") + '</select></div>' +
      '<div class="field"><label>初始音量</label><input class="input" name="volume" type="number" min="0" max="100" value="50"></div>' +
      '</div><p class="muted">创建后进入播控台，打开体验端链接即可开始。</p></form>';
    UI.modal({
      title: "新建体验会话",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "创建", className: "primary", onClick: async function (api) {
          const form = api.find("#session-form");
          try {
            const result = await API.post("/api/sessions", UI.formData(form));
            api.close();
            UI.toast("会话已创建", "success");
            location.hash = "#/session/" + result.data.session.id;
            if (done) done();
          } catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  }
};
App.register("sessions", SessionsView);
