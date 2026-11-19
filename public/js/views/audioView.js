const AudioView = {
  rows: [],
  presets: ["wind", "water", "room", "guqin", "loom", "chant", "chime", "bell", "wood"],
  render: async function (container) {
    const data = (await API.get("/api/audio")).data;
    AudioView.rows = data.rows;
    AudioView.presets = data.presets;
    const isAdmin = App.user.role === "ADMIN";
    container.innerHTML = UI.pageHead("非遗音景素材", "环境底噪、点声源与交互音效，由浏览器Web Audio本地合成", isAdmin ? '<button class="btn primary" id="audio-add">新增素材</button>' : "") +
      '<div class="card"><div class="card-body">' +
      UI.table({
        columns: [
          { title: "名称", key: "name" },
          { title: "类别", key: "categoryName" },
          { title: "合成预设", key: "preset" },
          { title: "声像", key: "pan", align: "right" },
          { title: "距离", key: "distance", align: "right" },
          { title: "音量", key: "volume", align: "right" },
          { title: "引用主题", key: "themeCount", align: "right" },
          { title: "状态", key: "enabled", render: function (row) { return UI.statusBadge(row.enabled ? "active" : "disabled"); } },
          { title: "说明", key: "description" },
          { title: "操作", key: "id", render: function (row) {
            if (!isAdmin) return "—";
            return '<button class="link" data-edit="' + UI.esc(row.id) + '">编辑</button><button class="link" data-toggle="' + UI.esc(row.id) + '">' + (row.enabled ? "停用" : "启用") + '</button><button class="link" data-remove="' + UI.esc(row.id) + '">删除</button>';
          } }
        ],
        rows: data.rows,
        empty: "暂无音频素材"
      }) + '</div></div>';
    if (!isAdmin) return;
    container.querySelector("#audio-add").addEventListener("click", function () { AudioView.openForm(null, container); });
    container.querySelectorAll("[data-edit]").forEach(function (button) {
      const row = data.rows.find(function (item) { return item.id === button.getAttribute("data-edit"); });
      button.addEventListener("click", function () { AudioView.openForm(row, container); });
    });
    container.querySelectorAll("[data-toggle]").forEach(function (button) {
      button.addEventListener("click", async function () {
        try { await API.post("/api/audio/" + button.getAttribute("data-toggle") + "/toggle", {}); AudioView.render(container); }
        catch (error) { UI.toast(error.message, "error"); }
      });
    });
    container.querySelectorAll("[data-remove]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const ok = await UI.confirm({ title: "删除素材", message: "被主题引用的素材不能删除，只能停用。", okText: "删除", danger: true });
        if (!ok) return;
        try { await API.del("/api/audio/" + button.getAttribute("data-remove")); AudioView.render(container); }
        catch (error) { UI.toast(error.message, "error"); }
      });
    });
  },
  openForm: function (row, container) {
    const body = '<form id="audio-form"><div class="form-grid">' +
      '<div class="field"><label>名称</label><input class="input" name="name" value="' + (row ? UI.esc(row.name) : "") + '"></div>' +
      '<div class="field"><label>类别</label><select class="input" name="category">' + UI.optionList([{ value: "ambient", label: "环境底噪" }, { value: "point", label: "点声源" }, { value: "interaction", label: "交互音效" }], row ? row.category : "ambient") + '</select></div>' +
      '<div class="field"><label>合成预设</label><select class="input" name="preset">' + UI.optionList(AudioView.presets, row ? row.preset : "wind") + '</select></div>' +
      '<div class="field"><label>声像（-1左至1右）</label><input class="input" name="pan" type="number" step="0.05" min="-1" max="1" value="' + (row ? row.pan : 0) + '"></div>' +
      '<div class="field"><label>距离（0.2至3）</label><input class="input" name="distance" type="number" step="0.1" min="0.2" max="3" value="' + (row ? row.distance : 1) + '"></div>' +
      '<div class="field"><label>音量（0至100）</label><input class="input" name="volume" type="number" min="0" max="100" value="' + (row ? row.volume : 40) + '"></div>' +
      '<div class="field full"><label>说明</label><textarea class="input" name="description" rows="2">' + (row ? UI.esc(row.description) : "") + '</textarea></div>' +
      '</div></form>';
    UI.modal({
      title: row ? "编辑音频素材" : "新增音频素材",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "保存", className: "primary", onClick: async function (api) {
          const form = api.find("#audio-form");
          try {
            if (row) await API.put("/api/audio/" + row.id, UI.formData(form));
            else await API.post("/api/audio", UI.formData(form));
            api.close();
            UI.toast("已保存", "success");
            AudioView.render(container);
          } catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  }
};
App.register("audio", AudioView);
