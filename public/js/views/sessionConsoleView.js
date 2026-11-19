const SessionConsoleView = {
  timer: null,
  poll: null,
  render: async function (container, params) {
    if (SessionConsoleView.timer) clearInterval(SessionConsoleView.timer);
    if (SessionConsoleView.poll) clearInterval(SessionConsoleView.poll);
    const data = (await API.get("/api/sessions/" + params.id)).data;
    const session = data.session;
    const summary = data.summary;
    const running = session.status === "running";
    const paused = session.status === "paused";
    const ended = session.status === "completed" || session.status === "aborted";
    container.innerHTML = UI.pageHead("播控台 " + session.id, session.participantCode + " · " + session.themeName,
      '<a class="btn" href="#/sessions">返回列表</a><a class="btn" href="#/session-detail/' + UI.esc(session.id) + '">会话详情</a>' +
      (ended && session.reportId ? '<a class="btn primary" href="#/reports/' + UI.esc(session.reportId) + '">查看报告</a>' : "")) +
      '<div class="console-grid"><div class="card console-preview"><div class="card-head"><h3>体验端场景预览</h3><span class="badge blue">状态同步</span></div>' +
      '<canvas id="scene-preview" width="720" height="405"></canvas>' +
      '<div class="preview-foot"><span id="preview-phase">' + (running ? "呼吸引导中" : paused ? "已暂停" : ended ? "已结束" : "等待开始") + '</span><span class="muted">本地场景缩略，不传输视频流</span></div></div>' +
      '<div class="card"><div class="card-head"><h3>会话状态</h3><span id="live-status">' + UI.statusBadge(session.status) + '</span></div><div class="card-body">' +
      '<table class="info-table"><tbody>' +
      '<tr><td>体验者</td><td>' + UI.esc(session.participantCode) + '</td></tr>' +
      '<tr><td>主题</td><td>' + UI.esc(session.themeName) + ' · ' + session.durationMin + ' 分钟</td></tr>' +
      '<tr><td>场景</td><td>' + (session.scene === "mountain" ? "山居禅院" : "古镇工坊") + '</td></tr>' +
      '<tr><td>呼吸模式</td><td>' + UI.esc(session.breathPattern) + '（周期19秒）</td></tr>' +
      '<tr><td>已进行</td><td><span id="live-elapsed">' + SessionConsoleView.clock(session.elapsedSec) + '</span></td></tr>' +
      '</tbody></table>' +
      '<div class="metric-grid">' +
      '<div class="metric"><strong id="live-gaze">' + summary.gazeHits + '</strong><span>凝视命中</span></div>' +
      '<div class="metric"><strong id="live-breath">' + summary.breathCycles + '</strong><span>呼吸周期</span></div>' +
      '<div class="metric"><strong id="live-motion">' + summary.motionIndex + '</strong><span>移动指数</span></div>' +
      '<div class="metric"><strong id="live-overall">' + summary.overall + '</strong><span>综合分</span></div>' +
      '</div>' +
      '<div class="row gap console-actions">' +
      '<button class="btn primary" id="btn-start"' + (session.status === "prepared" ? "" : " disabled") + '>开始体验</button>' +
      '<button class="btn" id="btn-pause"' + (running ? "" : " disabled") + '>暂停</button>' +
      '<button class="btn" id="btn-resume"' + (paused ? "" : " disabled") + '>继续</button>' +
      '<button class="btn" id="btn-stop"' + ((running || paused) ? "" : " disabled") + '>结束并生成报告</button>' +
      '<button class="btn danger" id="btn-abort"' + (ended ? " disabled" : "") + '>紧急停止</button>' +
      '<button class="btn" id="btn-experience">打开体验端</button>' +
      '</div></div></div></div>' +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>实时参数</h3><span class="muted">对体验端即时生效</span></div><div class="card-body">' +
      '<div class="field"><label>环境音量 <b id="vol-value">' + session.control.volume + '</b></label><input type="range" id="ctl-volume" min="0" max="100" value="' + session.control.volume + '"></div>' +
      '<div class="field"><label>场景亮度 <b id="bri-value">' + session.control.brightness + '</b></label><input type="range" id="ctl-brightness" min="0" max="100" value="' + session.control.brightness + '"></div>' +
      '<div class="field"><label>引导提示</label><div class="row gap"><input class="input" id="ctl-message" value="' + UI.esc(session.control.message) + '" placeholder="发送到体验端的短提示"><button class="btn" id="btn-message">发送</button></div></div>' +
      '<p class="muted">参数调整写入会话事件与审计日志。紧急停止后不能恢复原会话。</p></div></div>' +
      '<div class="card"><div class="card-head"><h3>会话事件</h3><span class="muted">最近 ' + session.events.length + ' 条</span></div><div class="card-body timeline">' +
      (session.events.length ? session.events.slice().reverse().map(function (item) {
        return '<div class="timeline-item"><time>' + UI.fmtDateTime(item.time) + '</time><strong>' + UI.esc(item.type) + '</strong><p>' + UI.esc(item.message) + '</p></div>';
      }).join("") : UI.empty("暂无事件", "开始体验后记录事件")) + '</div></div></div>';

    const canvas = container.querySelector("#scene-preview");
    const ctx = canvas.getContext("2d");
    SessionConsoleView.drawScene(ctx, canvas, session, summary);
    SessionConsoleView.timer = setInterval(function () {
      if (!document.getElementById("scene-preview")) {
        clearInterval(SessionConsoleView.timer);
        return;
      }
      SessionConsoleView.drawScene(ctx, canvas, session, summary);
    }, 180);

    function bind(id, action, confirmText) {
      const node = container.querySelector(id);
      if (!node) return;
      node.addEventListener("click", async function () {
        if (confirmText) {
          const ok = await UI.confirm({ title: "确认操作", message: confirmText, okText: "确认", danger: true });
          if (!ok) return;
        }
        node.disabled = true;
        try {
          await API.post("/api/sessions/" + session.id + "/" + action, action === "abort" ? { reason: "现场人员紧急停止" } : {});
          UI.toast("操作已提交", "success");
          SessionConsoleView.render(container, params);
        } catch (error) {
          UI.toast(error.message, "error");
          node.disabled = false;
        }
      });
    }
    bind("#btn-start", "start");
    bind("#btn-pause", "pause");
    bind("#btn-resume", "resume");
    bind("#btn-stop", "stop", "结束后将生成体验报告，且不能继续本次会话。");
    bind("#btn-abort", "abort", "紧急停止会立即中止体验并生成中止记录。");
    container.querySelector("#btn-experience").addEventListener("click", function () {
      window.open("experience.html?token=" + encodeURIComponent(session.token), "_blank");
    });
    container.querySelector("#ctl-volume").addEventListener("input", function () {
      container.querySelector("#vol-value").textContent = this.value;
    });
    container.querySelector("#ctl-brightness").addEventListener("input", function () {
      container.querySelector("#bri-value").textContent = this.value;
    });
    container.querySelector("#ctl-volume").addEventListener("change", function () {
      SessionConsoleView.control(session.id, { volume: Number(this.value) });
    });
    container.querySelector("#ctl-brightness").addEventListener("change", function () {
      SessionConsoleView.control(session.id, { brightness: Number(this.value) });
    });
    container.querySelector("#btn-message").addEventListener("click", function () {
      SessionConsoleView.control(session.id, { message: container.querySelector("#ctl-message").value.trim() });
    });

    SessionConsoleView.poll = setInterval(async function () {
      if (!document.getElementById("live-status")) {
        clearInterval(SessionConsoleView.poll);
        return;
      }
      try {
        const latest = (await API.get("/api/sessions/" + session.id)).data;
        if (latest.session.status !== session.status) {
          SessionConsoleView.render(container, params);
          return;
        }
        document.getElementById("live-status").innerHTML = UI.statusBadge(latest.session.status);
        document.getElementById("live-elapsed").textContent = SessionConsoleView.clock(latest.session.elapsedSec);
        document.getElementById("live-gaze").textContent = latest.summary.gazeHits;
        document.getElementById("live-breath").textContent = latest.summary.breathCycles;
        document.getElementById("live-motion").textContent = latest.summary.motionIndex;
        document.getElementById("live-overall").textContent = latest.summary.overall;
        if (latest.session.command === "pause") document.getElementById("preview-phase").textContent = "已暂停";
        else if (latest.session.status === "running") document.getElementById("preview-phase").textContent = "呼吸引导中";
        else if (latest.session.status === "prepared") document.getElementById("preview-phase").textContent = "等待开始";
        else document.getElementById("preview-phase").textContent = "已结束";
      } catch (error) { }
    }, 2000);
  },
  control: async function (id, body) {
    try { await API.post("/api/sessions/" + id + "/control", body); UI.toast("参数已同步", "success"); }
    catch (error) { UI.toast(error.message, "error"); }
  },
  clock: function (seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
  },
  drawScene: function (ctx, canvas, session, summary) {
    const w = canvas.width;
    const h = canvas.height;
    const time = Date.now() / 1000;
    const t = time % 19;
    const scale = t < 4 ? 0.6 + (t / 4) * 0.4 : t < 11 ? 1 : 0.6 + ((19 - t) / 8) * 0.4;
    const phase = t < 4 ? "吸气" : t < 11 ? "屏气" : "呼气";
    const bright = Number(session.control.brightness) / 100;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    if (session.scene === "workshop") {
      sky.addColorStop(0, "#1b1410");
      sky.addColorStop(0.55, "#3a2618");
      sky.addColorStop(1, "#120d0a");
    } else {
      sky.addColorStop(0, "#0a1620");
      sky.addColorStop(0.58, "#173242");
      sky.addColorStop(1, "#081017");
    }
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.35 + bright * 0.35;
    if (session.scene === "workshop") {
      ctx.fillStyle = "#4a3020";
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      for (let i = 0; i < 6; i += 1) {
        const x = 50 + i * 115;
        ctx.fillStyle = i % 2 ? "#2a1c14" : "#332218";
        ctx.fillRect(x, h * 0.38, 86, h * 0.32);
        ctx.fillStyle = "#e0a43a";
        ctx.fillRect(x + 18, h * 0.46, 20, 26);
        ctx.fillStyle = "#7fd8c5";
        ctx.fillRect(x + 48, h * 0.46, 18, 26);
      }
      ctx.strokeStyle = "#c9a06a";
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i += 1) {
        ctx.beginPath();
        ctx.moveTo(80 + i * 78, h * 0.72);
        ctx.lineTo(80 + i * 78, h * 0.72 - 40 - (i % 3) * 12);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#1d3a3a";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.lineTo(w * 0.22, h * 0.35);
      ctx.lineTo(w * 0.42, h * 0.62);
      ctx.lineTo(w * 0.63, h * 0.3);
      ctx.lineTo(w * 0.85, h * 0.6);
      ctx.lineTo(w, h * 0.45);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#12262b";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.78);
      ctx.lineTo(w * 0.3, h * 0.55);
      ctx.lineTo(w * 0.55, h * 0.76);
      ctx.lineTo(w * 0.8, h * 0.5);
      ctx.lineTo(w, h * 0.7);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#d9e6e0";
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.18, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a2a24";
      ctx.fillRect(w * 0.47, h * 0.58, 120, 54);
      ctx.beginPath();
      ctx.moveTo(w * 0.44, h * 0.58);
      ctx.lineTo(w * 0.53, h * 0.48);
      ctx.lineTo(w * 0.62, h * 0.58);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 5; i += 1) {
      const x = ((time * (12 + i * 3) + i * 160) % (w + 200)) - 100;
      ctx.fillStyle = "rgba(220,235,230," + (0.03 + i * 0.012) + ")";
      ctx.beginPath();
      ctx.ellipse(x, h * (0.58 + i * 0.03), 90, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.9;
    const cx = w / 2;
    const cy = h * 0.52;
    const radius = 58 * (session.status === "running" ? scale : 0.8);
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius * 1.8);
    glow.addColorStop(0, "rgba(127,216,197,0.75)");
    glow.addColorStop(0.5, "rgba(127,216,197,0.18)");
    glow.addColorStop(1, "rgba(127,216,197,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(214,245,238,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(230,255,250,0.92)";
    ctx.font = "16px SimHei";
    ctx.textAlign = "center";
    ctx.fillText(session.status === "running" ? phase : "待开始", cx, cy + 6);
    ctx.fillStyle = "rgba(220,240,235,0.75)";
    ctx.font = "13px SimSun";
    ctx.fillText("凝视命中 " + summary.gazeHits + " · 呼吸周期 " + summary.breathCycles + " · 综合分 " + summary.overall, cx, h - 26);
    ctx.textAlign = "left";
  }
};
App.register("session", SessionConsoleView);
