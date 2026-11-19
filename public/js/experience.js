const Experience = {
  token: "",
  session: null,
  started: false,
  paused: false,
  ended: false,
  startedAt: 0,
  accumulated: 0,
  lastFrame: 0,
  gazeHits: 0,
  breathCycles: 0,
  motionIndex: 0,
  motionAccum: 0,
  motionSamples: 0,
  lastMetrics: 0,
  lastPhase: "",
  targets: [],
  pointer: { x: 0, y: 0, active: false },
  audio: null,
  timers: [],
  poll: null,
  raf: 0,
  canvas: null,
  ctx: null,
  dpr: 1,

  init: async function () {
    Experience.token = new URLSearchParams(location.search).get("token") || "";
    Experience.canvas = document.getElementById("scene");
    Experience.ctx = Experience.canvas.getContext("2d");
    Experience.resize();
    window.addEventListener("resize", function () { Experience.resize(); });
    Experience.canvas.addEventListener("pointermove", function (event) {
      Experience.pointer.x = event.clientX;
      Experience.pointer.y = event.clientY;
      Experience.pointer.active = true;
      Experience.motionAccum += Math.abs(event.movementX || 0) + Math.abs(event.movementY || 0);
      Experience.motionSamples += 1;
    });
    document.getElementById("btn-start").addEventListener("click", function () { Experience.begin(); });
    document.getElementById("btn-finish").addEventListener("click", function () { Experience.complete(false); });
    document.getElementById("btn-close").addEventListener("click", function () { window.close(); });
    if (!Experience.token) {
      Experience.showError("缺少体验令牌，请从控制台重新打开体验端。");
      return;
    }
    try {
      const response = await fetch("/api/experience/" + encodeURIComponent(Experience.token) + "/state");
      const payload = await response.json();
      if (!response.ok || payload.code !== 0) {
        Experience.showError(payload.message || "体验链接不可用。");
        return;
      }
      Experience.session = payload.data.session;
      Experience.gazeHits = Experience.session.summary.gazeHits || 0;
      Experience.breathCycles = Experience.session.summary.breathCycles || 0;
      document.getElementById("lobby-theme").textContent = Experience.session.themeName;
      document.getElementById("lobby-desc").textContent = Experience.session.themeDescription || "跟随呼吸球与音景进入放松状态。";
      document.getElementById("lobby-code").textContent = "体验者 " + Experience.session.participantCode;
      document.getElementById("lobby-duration").textContent = Experience.session.durationMin + " 分钟";
      document.getElementById("hud-theme").textContent = Experience.session.themeName;
      if (Experience.session.status === "completed" || Experience.session.status === "aborted") {
        Experience.finishPanel(Experience.session.summary, Experience.session.status === "aborted");
      } else {
        document.getElementById("btn-start").textContent = Experience.session.status === "running" ? "进入体验" : "开始体验";
      }
      Experience.buildTargets();
      Experience.poll = setInterval(function () { Experience.sync(); }, 2000);
      Experience.lastFrame = performance.now();
      Experience.loop();
    } catch (error) {
      Experience.showError("无法连接本地服务，请确认软件已启动。");
    }
  },

  resize: function () {
    Experience.dpr = window.devicePixelRatio || 1;
    const canvas = Experience.canvas;
    canvas.width = Math.round(window.innerWidth * Experience.dpr);
    canvas.height = Math.round(window.innerHeight * Experience.dpr);
    Experience.ctx.setTransform(Experience.dpr, 0, 0, Experience.dpr, 0, 0);
    Experience.buildTargets();
  },

  buildTargets: function () {
    const scene = Experience.session ? Experience.session.scene : "mountain";
    const count = Experience.session ? Experience.session.focusTargets : 4;
    const base = scene === "workshop"
      ? [[0.2, 0.42], [0.42, 0.58], [0.64, 0.36], [0.78, 0.62], [0.55, 0.72], [0.3, 0.7], [0.86, 0.4], [0.12, 0.62]]
      : [[0.22, 0.4], [0.78, 0.32], [0.32, 0.7], [0.7, 0.66], [0.5, 0.3], [0.86, 0.55], [0.14, 0.62], [0.58, 0.78]];
    const labels = scene === "workshop" ? ["织机", "梭子", "经线", "灯笼", "窗棂", "染缸", "木架", "门环"] : ["香炉", "风铃", "石灯", "古琴", "月亮", "竹影", "水钵", "山门"];
    Experience.targets = [];
    for (let i = 0; i < Math.min(count, 8); i += 1) {
      Experience.targets.push({ x: base[i][0], y: base[i][1], r: 46, hit: false, dwell: 0, label: labels[i] });
    }
  },

  begin: async function () {
    if (Experience.ended) return;
    try {
      const response = await fetch("/api/experience/" + encodeURIComponent(Experience.token) + "/begin", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const payload = await response.json();
      if (!response.ok || payload.code !== 0) {
        Experience.showError(payload.message || "无法开始体验。");
        return;
      }
      Experience.session = payload.data.session;
      Experience.started = true;
      Experience.paused = false;
      Experience.startedAt = performance.now();
      Experience.accumulated = Experience.session.elapsedSec || 0;
      Experience.lastMetrics = Experience.accumulated;
      document.getElementById("lobby").hidden = true;
      document.getElementById("hud").style.display = "flex";
      Experience.initAudio(Experience.session);
      Experience.lastFrame = performance.now();
    } catch (error) {
      Experience.showError("开始失败，请返回控制台重新打开体验端。");
    }
  },

  elapsed: function () {
    if (!Experience.started) return Experience.session ? Experience.session.elapsedSec || 0 : 0;
    if (Experience.paused) return Experience.accumulated;
    return Experience.accumulated + (performance.now() - Experience.startedAt) / 1000;
  },

  breathing: function () {
    const result = Breath.phaseAt(Experience.elapsed());
    return { t: result.t, phase: result.phase, scale: result.scale };
  },

  loop: function () {
    Experience.raf = requestAnimationFrame(function () { Experience.loop(); });
    const now = performance.now();
    const dt = Math.min(0.1, (now - Experience.lastFrame) / 1000);
    Experience.lastFrame = now;
    if (Experience.ended) return;
    const breath = Experience.breathing();
    if (Experience.session && Experience.session.status === "running" && !Experience.paused) {
      Experience.updateGaze(dt);
      Experience.breathCycles = Math.floor(Experience.elapsed() / 19);
      if (Experience.elapsed() >= (Experience.session.durationMin || 12) * 60) {
        Experience.complete(false);
        return;
      }
      if (Experience.elapsed() - Experience.lastMetrics >= 5) {
        Experience.sendMetrics(breath.phase);
        Experience.lastMetrics = Experience.elapsed();
      }
    }
    Experience.draw(breath);
    Experience.updateHud(breath);
  },

  updateGaze: function (dt) {
    if (!Experience.pointer.active) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    Experience.targets.forEach(function (target) {
      const tx = target.x * w;
      const ty = target.y * h;
      const distance = Math.sqrt(Math.pow(Experience.pointer.x - tx, 2) + Math.pow(Experience.pointer.y - ty, 2));
      if (distance < target.r) {
        target.dwell += dt;
        if (target.dwell >= 2 && !target.hit) {
          target.hit = true;
          Experience.gazeHits += 1;
          Experience.playInteraction();
          Experience.sendEvent("gaze", "凝视命中：" + target.label);
        }
      } else {
        target.dwell = 0;
      }
    });
    if (Experience.motionSamples >= 30) {
      const speed = Experience.motionAccum / Experience.motionSamples;
      Experience.motionIndex = Math.max(0, Math.min(100, Math.round(speed * 6)));
      Experience.motionAccum = 0;
      Experience.motionSamples = 0;
    }
    if (Experience.audio && Experience.audio.filter) {
      const cutoff = 260 + Experience.breathing().scale * 1600;
      Experience.audio.filter.frequency.setTargetAtTime(cutoff, Experience.audio.context.currentTime, 0.15);
    }
  },

  draw: function (breath) {
    const ctx = Experience.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const session = Experience.session || { scene: "mountain", control: { brightness: 60 } };
    const scene = session.scene;
    const time = performance.now() / 1000;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    if (scene === "workshop") {
      sky.addColorStop(0, "#1a120d");
      sky.addColorStop(0.55, "#392417");
      sky.addColorStop(1, "#0e0907");
    } else {
      sky.addColorStop(0, "#07131b");
      sky.addColorStop(0.55, "#173442");
      sky.addColorStop(1, "#061014");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    if (scene === "workshop") {
      ctx.fillStyle = "#3a2619";
      ctx.fillRect(0, h * 0.64, w, h * 0.36);
      for (let i = 0; i < 7; i += 1) {
        const x = w * (0.06 + i * 0.14);
        ctx.fillStyle = i % 2 ? "#2a1b12" : "#332116";
        ctx.fillRect(x, h * 0.36, w * 0.1, h * 0.3);
        ctx.fillStyle = "#e0a43a";
        ctx.fillRect(x + w * 0.02, h * 0.44, w * 0.018, h * 0.035);
        ctx.fillStyle = "#7fd8c5";
        ctx.fillRect(x + w * 0.055, h * 0.44, w * 0.016, h * 0.035);
      }
      ctx.strokeStyle = "rgba(201,160,106,0.75)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i += 1) {
        ctx.beginPath();
        ctx.moveTo(w * (0.1 + i * 0.09), h * 0.76);
        ctx.lineTo(w * (0.1 + i * 0.09), h * 0.76 - 42 - (i % 3) * 14);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i += 1) {
        const bx = w * (0.18 + i * 0.16);
        ctx.fillStyle = "rgba(120,44,38,0.55)";
        ctx.fillRect(bx, h * 0.24, w * 0.035, h * 0.11);
        ctx.fillStyle = "rgba(230,196,120,0.55)";
        ctx.fillRect(bx + w * 0.008, h * 0.255, w * 0.006, h * 0.06);
      }
      ctx.strokeStyle = "rgba(120,88,58,0.6)";
      ctx.lineWidth = 5;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, h * (0.16 + i * 0.04));
        ctx.lineTo(w, h * (0.1 + i * 0.04));
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#193636";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.7);
      ctx.lineTo(w * 0.2, h * 0.34);
      ctx.lineTo(w * 0.42, h * 0.64);
      ctx.lineTo(w * 0.62, h * 0.28);
      ctx.lineTo(w * 0.84, h * 0.6);
      ctx.lineTo(w, h * 0.46);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#102329";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.8);
      ctx.lineTo(w * 0.3, h * 0.56);
      ctx.lineTo(w * 0.56, h * 0.78);
      ctx.lineTo(w * 0.8, h * 0.5);
      ctx.lineTo(w, h * 0.72);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(217,230,224,0.9)";
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.18, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c2a26";
      ctx.fillRect(w * 0.46, h * 0.6, w * 0.13, h * 0.1);
      ctx.beginPath();
      ctx.moveTo(w * 0.43, h * 0.6);
      ctx.lineTo(w * 0.525, h * 0.49);
      ctx.lineTo(w * 0.62, h * 0.6);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 42; i += 1) {
        const sx = (i * 137 + 31) % w;
        const sy = (i * 71 + 17) % (h * 0.42);
        ctx.fillStyle = "rgba(230,245,240," + (0.12 + Math.abs(Math.sin(time + i)) * 0.35) + ")";
        ctx.beginPath();
        ctx.arc(sx, sy, i % 5 === 0 ? 1.6 : 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 7; i += 1) {
        const px = w * (0.08 + i * 0.13);
        const py = h * 0.58 + (i % 3) * 22;
        ctx.fillStyle = "rgba(10,30,28,0.85)";
        ctx.beginPath();
        ctx.moveTo(px, py - 46 - (i % 2) * 18);
        ctx.lineTo(px - 16, py);
        ctx.lineTo(px + 16, py);
        ctx.closePath();
        ctx.fill();
      }
      const path = ctx.createLinearGradient(0, h * 0.72, 0, h);
      path.addColorStop(0, "rgba(160,180,170,0.16)");
      path.addColorStop(1, "rgba(160,180,170,0.02)");
      ctx.strokeStyle = path;
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.72);
      ctx.quadraticCurveTo(w * 0.56, h * 0.86, w * 0.42, h);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i += 1) {
      const x = ((time * (10 + i * 3) + i * 190) % (w + 260)) - 130;
      ctx.fillStyle = "rgba(220,235,230," + (0.025 + i * 0.01) + ")";
      ctx.beginPath();
      ctx.ellipse(x, h * (0.58 + i * 0.035), 110, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const brightness = session.control ? session.control.brightness : 60;
    Experience.canvas.style.filter = "brightness(" + (0.55 + brightness / 100 * 0.55) + ")";
    Experience.drawTargets(ctx, w, h, time);
    const cx = w / 2;
    const cy = h * 0.5;
    const radius = 66 * (Experience.started ? breath.scale : 0.8);
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius * 2);
    glow.addColorStop(0, "rgba(127,216,197,0.78)");
    glow.addColorStop(0.45, "rgba(127,216,197,0.2)");
    glow.addColorStop(1, "rgba(127,216,197,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(210,245,238,0.75)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(232,255,250,0.9)";
    ctx.font = "15px SimHei";
    ctx.textAlign = "center";
    ctx.fillText(Experience.started ? breath.phase : "准备", cx, cy + 5);
    ctx.font = "11px SimSun";
    ctx.fillStyle = "rgba(210,235,230,0.55)";
    ctx.fillText("吸气 4 · 屏气 7 · 呼气 8", cx, cy + 27);
    ctx.textAlign = "left";
    if (Experience.pointer.active) {
      ctx.strokeStyle = "rgba(240,255,250,0.75)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(Experience.pointer.x, Experience.pointer.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(Experience.pointer.x, Experience.pointer.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(240,255,250,0.9)";
      ctx.fill();
    }
  },

  drawTargets: function (ctx, w, h, time) {
    Experience.targets.forEach(function (target) {
      const x = target.x * w;
      const y = target.y * h;
      const pulse = 0.5 + Math.sin(time * 1.6 + target.x * 6) * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, target.r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = target.hit ? "rgba(224,164,58,0.28)" : "rgba(127,216,197," + (0.06 + pulse * 0.08) + ")";
      ctx.fill();
      ctx.strokeStyle = target.hit ? "rgba(240,196,96,0.9)" : "rgba(127,216,197,0.55)";
      ctx.lineWidth = target.hit ? 2 : 1.2;
      ctx.beginPath();
      ctx.arc(x, y, target.r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      if (target.dwell > 0 && !target.hit) {
        ctx.strokeStyle = "rgba(240,255,250,0.9)";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(x, y, target.r * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, target.dwell / 2));
        ctx.stroke();
      }
      ctx.fillStyle = target.hit ? "rgba(240,210,140,0.9)" : "rgba(200,232,225,0.55)";
      ctx.font = "11px SimSun";
      ctx.textAlign = "center";
      ctx.fillText(target.label, x, y + target.r * 0.55 + 16);
      ctx.textAlign = "left";
    });
  },

  updateHud: function (breath) {
    const total = (Experience.session ? Experience.session.durationMin : 12) * 60;
    document.getElementById("hud-time").textContent = Experience.clock(Experience.elapsed()) + " / " + Experience.clock(total);
    document.getElementById("hud-phase").textContent = Experience.ended ? "已结束" : Experience.paused ? "已暂停" : Experience.started ? breath.phase : "准备";
    const session = Experience.session;
    if (session && session.control) {
      document.getElementById("hud-control").textContent = "音量 " + session.control.volume + " · 亮度 " + session.control.brightness;
    }
    Experience.lastPhase = breath.phase;
  },

  clock: function (value) {
    const sec = Math.max(0, Math.floor(Number(value) || 0));
    return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  },

  sendMetrics: function (phase) {
    fetch("/api/experience/" + encodeURIComponent(Experience.token) + "/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elapsedSec: Math.round(Experience.elapsed()),
        gazeHits: Experience.gazeHits,
        breathCycles: Experience.breathCycles,
        motionIndex: Experience.motionIndex,
        phase: phase
      })
    }).catch(function () {});
  },

  sendEvent: function (type, message) {
    fetch("/api/experience/" + encodeURIComponent(Experience.token) + "/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: type, message: message })
    }).catch(function () {});
  },

  sync: async function () {
    if (Experience.ended || !Experience.session) return;
    try {
      const response = await fetch("/api/experience/" + encodeURIComponent(Experience.token) + "/state");
      const payload = await response.json();
      if (!response.ok || payload.code !== 0) {
        if (response.status === 410) Experience.showError("体验链接已过期。");
        return;
      }
      const latest = payload.data.session;
      Experience.session.control = latest.control;
      if (latest.status === "paused" && !Experience.paused) Experience.pause();
      if (latest.status === "running" && Experience.paused) Experience.resume();
      if ((latest.status === "completed" || latest.status === "aborted") && !Experience.ended) {
        Experience.finishPanel(latest.summary, latest.status === "aborted");
      }
      if (latest.command) {
        fetch("/api/experience/" + encodeURIComponent(Experience.token) + "/ack", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(function () {});
      }
    } catch (error) { }
  },

  pause: function () {
    if (Experience.paused) return;
    Experience.accumulated = Experience.elapsed();
    Experience.paused = true;
    if (Experience.audio) Experience.audio.context.suspend();
    Experience.sendEvent("pause", "体验端暂停");
  },

  resume: function () {
    if (!Experience.paused) return;
    Experience.paused = false;
    Experience.startedAt = performance.now();
    if (Experience.audio) Experience.audio.context.resume();
    Experience.sendEvent("resume", "体验端继续");
  },

  complete: async function (aborted) {
    if (Experience.ended) return;
    const elapsed = Math.max(1, Math.round(Experience.elapsed()));
    Experience.ended = true;
    Experience.stopAudio();
    try {
      const response = await fetch("/api/experience/" + encodeURIComponent(Experience.token) + "/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elapsedSec: elapsed,
          gazeHits: Experience.gazeHits,
          breathCycles: Experience.breathCycles,
          motionIndex: Experience.motionIndex
        })
      });
      const payload = await response.json();
      if (response.ok && payload.code === 0) {
        const report = payload.data.report;
        Experience.finishPanel({
          overall: report.overall,
          focusScore: report.focusScore,
          relaxScore: report.relaxScore,
          completion: report.completion,
          gazeHits: report.gazeHits,
          breathCycles: report.breathCycles
        }, aborted);
      } else {
        Experience.finishPanel({ overall: 0, focusScore: 0, relaxScore: 0, completion: 0, gazeHits: Experience.gazeHits, breathCycles: Experience.breathCycles }, aborted);
      }
    } catch (error) {
      Experience.finishPanel({ overall: 0, focusScore: 0, relaxScore: 0, completion: 0, gazeHits: Experience.gazeHits, breathCycles: Experience.breathCycles }, aborted);
    }
  },

  finishPanel: function (summary, aborted) {
    Experience.ended = true;
    Experience.stopAudio();
    document.getElementById("lobby").hidden = true;
    document.getElementById("end-panel").hidden = false;
    document.getElementById("end-title").textContent = aborted ? "体验已中止" : "本次体验完成";
    document.getElementById("end-note").textContent = aborted ? "记录已回传控制台，可在会话详情查看中止记录。" : "体验数据已回传控制台，报告可在控制台查看。";
    const items = [
      ["综合分", summary.overall || 0],
      ["专注分", summary.focusScore || 0],
      ["放松分", summary.relaxScore || 0],
      ["完成度", summary.completion || 0],
      ["凝视命中", summary.gazeHits || 0],
      ["呼吸周期", summary.breathCycles || 0]
    ];
    document.getElementById("end-metrics").innerHTML = items.map(function (item) {
      return "<div><strong>" + item[1] + "</strong>" + item[0] + "</div>";
    }).join("");
  },

  showError: function (message) {
    document.getElementById("error-panel").hidden = false;
    document.getElementById("error-text").textContent = message;
  },

  initAudio: function (session) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const master = context.createGain();
    master.gain.value = Math.max(0, Math.min(1, session.control.volume / 100)) * 0.55;
    master.connect(context.destination);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.6;
    filter.connect(master);
    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseGain = context.createGain();
    noiseGain.gain.value = 0.07;
    noise.connect(noiseGain);
    noiseGain.connect(filter);
    noise.start();
    const point = context.createGain();
    point.gain.value = 0.05;
    point.connect(filter);
    Experience.audio = { context: context, master: master, filter: filter, point: point, noise: noise };
    const assets = session.audio || [];
    const pointAssets = assets.filter(function (item) { return item.category === "point"; });
    pointAssets.forEach(function (item) {
      Experience.schedulePoint(item, session);
    });
    Experience.playAmbientTone(session);
  },

  playAmbientTone: function (session) {
    const audio = Experience.audio;
    if (!audio) return;
    const context = audio.context;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = session.scene === "workshop" ? "triangle" : "sine";
    osc.frequency.value = session.scene === "workshop" ? 98 : 146.83;
    gain.gain.value = 0.018;
    osc.connect(gain);
    gain.connect(audio.filter);
    osc.start();
  },

  schedulePoint: function (asset, session) {
    const audio = Experience.audio;
    if (!audio) return;
    const context = audio.context;
    function ping(freq, type, duration, volume) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner ? context.createStereoPanner() : null;
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      osc.connect(gain);
      if (panner) {
        panner.pan.value = asset.pan;
        gain.connect(panner);
        panner.connect(audio.filter);
      } else {
        gain.connect(audio.filter);
      }
      osc.start();
      osc.stop(context.currentTime + duration);
    }
    let interval = 4000;
    if (asset.preset === "loom") interval = 1100;
    if (asset.preset === "chime") interval = 6500;
    if (asset.preset === "chant") interval = 9000;
    const timer = setInterval(function () {
      if (!Experience.audio || Experience.paused || Experience.ended) return;
      if (asset.preset === "guqin") ping(196, "triangle", 1.8, 0.05);
      else if (asset.preset === "loom") ping(92, "square", 0.18, 0.035);
      else if (asset.preset === "chant") ping(110, "sine", 2.6, 0.025);
      else if (asset.preset === "chime") ping(880, "sine", 1.4, 0.03);
    }, interval);
    Experience.timers.push(timer);
  },

  playInteraction: function () {
    const audio = Experience.audio;
    if (!audio) return;
    const context = audio.context;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = Experience.session && Experience.session.scene === "workshop" ? "square" : "sine";
    osc.frequency.value = Experience.session && Experience.session.scene === "workshop" ? 220 : 880;
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start();
    osc.stop(context.currentTime + 0.85);
  },

  stopAudio: function () {
    Experience.timers.forEach(function (timer) { clearInterval(timer); });
    Experience.timers = [];
    if (Experience.audio) {
      try {
        Experience.audio.timers = [];
        Experience.audio.context.close();
      } catch (error) { }
      Experience.audio = null;
    }
  }
};

Experience.init();
