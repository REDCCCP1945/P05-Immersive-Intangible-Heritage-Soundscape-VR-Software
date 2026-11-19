const ThemesView = {
  audioRows: [],
  render: async function (container) {
    const data = (await API.get("/api/themes")).data;
    ThemesView.audioRows = (await API.get("/api/audio")).data.rows;
    const isAdmin = App.user.role === "ADMIN";
    container.innerHTML = UI.pageHead("疗愈主题", "两套主题流程：山居静心与匠心之境", isAdmin ? '<button class="btn primary" id="theme-add">新增主题</button>' : "") +
      '<div class="theme-grid">' + data.rows.map(function (theme) {
        return '<div class="theme-card"><div class="theme-visual ' + UI.esc(theme.scene) + '"><span>' + UI.esc(theme.name) + '</span></div>' +
          '<div class="theme-body"><div class="row between"><strong>' + UI.esc(theme.name) + '</strong>' + UI.statusBadge(theme.enabled ? "active" : "disabled") + '</div>' +
          '<p>' + UI.esc(theme.description) + '</p>' +
          '<div class="theme-meta"><span>场景：' + (theme.scene === "mountain" ? "山居禅院" : "古镇工坊") + '</span><span>时长：' + theme.durationMin + ' 分钟</span>' +
          '<span>呼吸：' + UI.esc(theme.breathPattern) + '</span><span>凝视目标：' + theme.focusTargets + '</span>' +
          '<span>音景：' + UI.esc(theme.audioName) + '</span><span>会话：' + theme.sessionCount + ' 次</span></div>' +
          (isAdmin ? '<div class="row gap"><button class="btn" data-edit="' + UI.esc(theme.id) + '">编辑</button><button class="btn" data-toggle="' + UI.esc(theme.id) + '">' + (theme.enabled ? "停用" : "启用") + '</button><button class="btn danger" data-remove="' + UI.esc(theme.id) + '">删除</button></div>' : "") +
          '</div></div>';
      }).join("") + '</div>';
    if (isAdmin) {
      container.querySelector("#theme-add").addEventListener("click", function () { ThemesView.openForm(null, data, container); });
      container.querySelectorAll("[data-edit]").forEach(function (button) {
        const theme = data.rows.find(function (item) { return item.id === button.getAttribute("data-edit"); });
        button.addEventListener("click", function () { ThemesView.openForm(theme, data, container); });
      });
      container.querySelectorAll("[data-toggle]").forEach(function (button) {
        button.addEventListener("click", async function () {
          try { await API.post("/api/themes/" + button.getAttribute("data-toggle") + "/toggle", {}); ThemesView.render(container); }
          catch (error) { UI.toast(error.message, "error"); }
        });
      });
      container.querySelectorAll("[data-remove]").forEach(function (button) {
        button.addEventListener("click", async function () {
          const ok = await UI.confirm({ title: "删除主题", message: "删除后不可恢复；被会话引用的主题只能停用。", okText: "删除", danger: true });
          if (!ok) return;
          try { await API.del("/api/themes/" + button.getAttribute("data-remove")); ThemesView.render(container); }
          catch (error) { UI.toast(error.message, "error"); }
        });
      });
    }
  },
  openForm: function (theme, data, container) {
    const body = '<form id="theme-form"><div class="form-grid">' +
      '<div class="field"><label>主题名称</label><input class="input" name="name" value="' + (theme ? UI.esc(theme.name) : "") + '"></div>' +
      '<div class="field"><label>主题编码</label><input class="input" name="code" value="' + (theme ? UI.esc(theme.code) : "") + '" placeholder="小写字母与连字符"></div>' +
      '<div class="field"><label>场景</label><select class="input" name="scene">' + UI.optionList([{ value: "mountain", label: "山居禅院" }, { value: "workshop", label: "古镇工坊" }], theme ? theme.scene : "mountain") + '</select></div>' +
      '<div class="field"><label>时长（分钟）</label><input class="input" name="durationMin" type="number" min="5" max="30" value="' + (theme ? theme.durationMin : 12) + '"></div>' +
      '<div class="field"><label>凝视目标数</label><input class="input" name="focusTargets" type="number" min="1" max="8" value="' + (theme ? theme.focusTargets : 4) + '"></div>' +
      '<div class="field"><label>音景预设</label><select class="input" name="audioPreset">' + UI.optionList(ThemesView.audioRows.map(function (item) { return { value: item.id, label: item.name + "（" + item.category + "）" }; }), theme ? theme.audioPreset : (ThemesView.audioRows[0] ? ThemesView.audioRows[0].id : "")) + '</select></div>' +
      '<div class="field full"><label>说明</label><textarea class="input" name="description" rows="3">' + (theme ? UI.esc(theme.description) : "") + '</textarea></div>' +
      '</div><p class="muted">呼吸模式固定为4-7-8；场景与音景由体验端本地合成。</p></form>';
    const modal = UI.modal({
      title: theme ? "编辑主题" : "新增主题",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "保存", className: "primary", onClick: async function (api) {
          const form = api.find("#theme-form");
          try {
            if (theme) await API.put("/api/themes/" + theme.id, UI.formData(form));
            else await API.post("/api/themes", UI.formData(form));
            api.close();
            UI.toast("已保存", "success");
            ThemesView.render(container);
          } catch (error) { UI.showError(form, error); }
        } }
      ]
    });
    return modal;
  }
};
App.register("themes", ThemesView);
