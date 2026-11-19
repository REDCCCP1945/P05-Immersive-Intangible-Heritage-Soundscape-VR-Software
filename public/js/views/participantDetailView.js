const ParticipantDetailView = {
  render: async function (container, params) {
    const data = (await API.get("/api/participants/" + params.id)).data;
    const row = data.participant;
    container.innerHTML = UI.pageHead("体验者 " + row.code, "匿名档案与历史会话", '<a class="btn" href="#/participants">返回列表</a>') +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>档案信息</h3><span class="muted">' + UI.statusBadge(row.status) + '</span></div><div class="card-body">' +
      '<table class="info-table"><tbody>' +
      '<tr><td>匿名编码</td><td>' + UI.esc(row.code) + '</td></tr>' +
      '<tr><td>年龄段</td><td>' + UI.esc(row.ageBand) + '</td></tr>' +
      '<tr><td>性别</td><td>' + UI.esc(row.gender) + '</td></tr>' +
      '<tr><td>体验前压力</td><td>' + UI.esc(row.prePressure) + ' / 10</td></tr>' +
      '<tr><td>备注</td><td>' + UI.esc(row.note || "—") + '</td></tr>' +
      '<tr><td>登记时间</td><td>' + UI.fmtDateTime(row.createdAt) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="row gap"><button class="btn" id="edit-participant">编辑档案</button>' +
      (App.user.role === "OPERATOR" ? "" : '<button class="btn" id="archive-participant">' + (row.status === "archived" ? "恢复档案" : "归档档案") + '</button>') +
      '</div></div></div>' +
      '<div class="card"><div class="card-head"><h3>历史会话</h3><span class="muted">共 ' + data.sessions.length + ' 次</span></div><div class="card-body">' +
      UI.table({
        columns: [
          { title: "会话", key: "id", render: function (item) { return '<a href="#/session-detail/' + UI.esc(item.id) + '">' + UI.esc(item.id) + "</a>"; } },
          { title: "主题", key: "themeName" },
          { title: "状态", key: "status", render: function (item) { return UI.statusBadge(item.status); } },
          { title: "时长", key: "elapsedSec", render: function (item) { return Math.round(item.elapsedSec / 60) + " 分钟"; } },
          { title: "综合分", key: "metrics", render: function (item) { return UI.esc(item.metrics.overall); } }
        ],
        rows: data.sessions,
        empty: "暂无会话"
      }) + '</div></div></div>';
    container.querySelector("#edit-participant").addEventListener("click", function () {
      ParticipantsView.openForm(row, function () { ParticipantDetailView.render(container, params); });
    });
    const archive = container.querySelector("#archive-participant");
    if (archive) {
      archive.addEventListener("click", async function () {
        try {
          await API.post("/api/participants/" + row.id + "/archive", {});
          UI.toast("状态已更新", "success");
          ParticipantDetailView.render(container, params);
        } catch (error) { UI.toast(error.message, "error"); }
      });
    }
  }
};
App.register("participant-detail", ParticipantDetailView);
