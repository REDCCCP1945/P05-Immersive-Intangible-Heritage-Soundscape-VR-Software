const ParticipantsView = {
  state: { page: 1, size: 10, keyword: "", status: "" },
  render: async function (container) {
    async function load() {
      const query = "?page=" + ParticipantsView.state.page + "&size=" + ParticipantsView.state.size +
        "&keyword=" + encodeURIComponent(ParticipantsView.state.keyword) + "&status=" + encodeURIComponent(ParticipantsView.state.status);
      const data = (await API.get("/api/participants" + query)).data;
      container.innerHTML = UI.pageHead("体验者档案", "匿名编码登记，不采集真实姓名与身份证", '<button class="btn primary" id="participant-add">新建体验者</button>') +
        '<div class="kpi-grid">' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.total) + '</strong><span>全部档案</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.active) + '</strong><span>在册</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.archived) + '</strong><span>已归档</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.today) + '</strong><span>今日新增</span></div>' +
        '</div>' +
        '<div class="card"><div class="card-body">' +
        '<div class="filter-bar"><input class="input" id="p-keyword" placeholder="编码或备注" value="' + UI.esc(ParticipantsView.state.keyword) + '">' +
        '<select class="input" id="p-status"><option value="">全部状态</option><option value="active"' + (ParticipantsView.state.status === "active" ? " selected" : "") + '>在册</option><option value="archived"' + (ParticipantsView.state.status === "archived" ? " selected" : "") + '>已归档</option></select>' +
        '<button class="btn" id="p-search">查询</button></div>' +
        UI.table({
          columns: [
            { title: "编码", key: "code", render: function (row) { return '<a href="#/participants/' + UI.esc(row.id) + '">' + UI.esc(row.code) + "</a>"; } },
            { title: "年龄段", key: "ageBand" },
            { title: "性别", key: "gender" },
            { title: "压力自评", key: "prePressure", align: "right" },
            { title: "备注", key: "note" },
            { title: "状态", key: "status", render: function (row) { return UI.statusBadge(row.status); } },
            { title: "登记时间", key: "createdAt", render: function (row) { return UI.fmtDateTime(row.createdAt); } },
            { title: "操作", key: "id", render: function (row) {
              return '<a class="link" href="#/participants/' + UI.esc(row.id) + '">详情</a>' +
                (App.user.role === "OPERATOR" ? "" : '<button class="link" data-archive="' + UI.esc(row.id) + '">' + (row.status === "archived" ? "恢复" : "归档") + "</button>");
            } }
          ],
          rows: data.rows,
          empty: "暂无体验者"
        }) + UI.pagination(data, function () {}) + '</div></div>';
      UI.bindPagination(container, ParticipantsView.state, load);
      container.querySelector("#p-search").addEventListener("click", function () {
        ParticipantsView.state.keyword = container.querySelector("#p-keyword").value.trim();
        ParticipantsView.state.status = container.querySelector("#p-status").value;
        ParticipantsView.state.page = 1;
        load();
      });
      container.querySelector("#participant-add").addEventListener("click", function () { ParticipantsView.openForm(null, load); });
      container.querySelectorAll("[data-archive]").forEach(function (button) {
        button.addEventListener("click", async function () {
          try {
            await API.post("/api/participants/" + button.getAttribute("data-archive") + "/archive", {});
            UI.toast("档案状态已更新", "success");
            load();
          } catch (error) { UI.toast(error.message, "error"); }
        });
      });
    }
    await load();
  },
  openForm: function (row, done) {
    const body = '<form id="participant-form"><div class="form-grid">' +
      '<div class="field"><label>年龄段</label><select class="input" name="ageBand">' + UI.optionList(["18-24", "25-34", "35-44", "45-54", "55以上"], row ? row.ageBand : "25-34") + '</select></div>' +
      '<div class="field"><label>性别</label><select class="input" name="gender">' + UI.optionList(["女", "男", "不便说明"], row ? row.gender : "不便说明") + '</select></div>' +
      '<div class="field"><label>体验前压力自评（0至10）</label><input class="input" name="prePressure" type="number" min="0" max="10" value="' + (row ? row.prePressure : 6) + '"></div>' +
      '<div class="field full"><label>备注</label><textarea class="input" name="note" rows="3" placeholder="如对强光敏感、需轻声引导">' + (row ? UI.esc(row.note) : "") + '</textarea></div>' +
      '</div><p class="muted">系统将自动生成“日期+流水号”的匿名编码，不采集真实姓名。</p></form>';
    const modal = UI.modal({
      title: row ? "编辑体验者" : "新建体验者",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "保存", className: "primary", onClick: async function (api) {
          const form = api.find("#participant-form");
          try {
            if (row) await API.put("/api/participants/" + row.id, UI.formData(form));
            else await API.post("/api/participants", UI.formData(form));
            api.close();
            UI.toast("已保存", "success");
            if (done) done();
          } catch (error) { UI.showError(form, error); }
        } }
      ]
    });
    return modal;
  }
};
App.register("participants", ParticipantsView);
