const LoginView = {
  render: function (container, message) {
    container.innerHTML = '<div class="login-wrap"><div class="login-hero">' +
      '<div><div class="eyebrow">SHAANXI UNIVERSITY OF TECHNOLOGY</div>' +
      '<h1>非遗音景<br>沉浸式疗愈体验</h1>' +
      '<p>以非遗音景、呼吸引导与凝视交互构建本地沉浸式体验；控制台记录体验过程、生成行为报告。数据保存在本机，不上传云端。</p></div>' +
      '<div class="hero-foot"><span>陕西理工大学</span><span>软件版本 V1.0.0</span><span>本地体验 · 数据不出本机</span></div></div>' +
      '<div class="login-form"><h2>登录控制台</h2><div class="sub">请使用分配的账号进入对应角色空间</div><div id="login-error"></div>' +
      '<form id="login-form"><div class="field"><label>用户名</label><input class="input" name="username" autocomplete="username" placeholder="请输入用户名"></div>' +
      '<div class="field"><label>密码</label><input class="input" name="password" type="password" autocomplete="current-password" placeholder="请输入密码"></div>' +
      '<button class="btn primary" type="submit">登录</button></form>' +
      '<div class="login-note">连续5次密码错误将锁定10分钟。首次登录后请在个人中心修改初始密码。</div>' +
      '<div class="account-hints"><strong>初始账号</strong>' +
      '<button type="button" data-user="admin01" data-pass="Admin@2026"><span>系统管理员 admin01</span><span>Admin@2026</span></button>' +
      '<button type="button" data-user="guide01" data-pass="Guide@2026"><span>咨询师/导览员 guide01</span><span>Guide@2026</span></button>' +
      '<button type="button" data-user="operator01" data-pass="Operator@2026"><span>现场运营 operator01</span><span>Operator@2026</span></button></div>' +
      '</div></div>';
    const form = container.querySelector("#login-form");
    const errorBox = container.querySelector("#login-error");
    if (message) errorBox.innerHTML = '<div class="login-error">' + UI.esc(message) + "</div>";
    container.querySelectorAll(".account-hints button").forEach(function (button) {
      button.addEventListener("click", function () {
        form.username.value = button.getAttribute("data-user");
        form.password.value = button.getAttribute("data-pass");
      });
    });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      errorBox.innerHTML = "";
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "正在登录";
      try {
        const result = await API.post("/api/auth/login", { username: form.username.value.trim(), password: form.password.value });
        App.afterLogin(result);
      } catch (error) {
        errorBox.innerHTML = '<div class="login-error">' + UI.esc(error.message) + "</div>";
        button.disabled = false;
        button.textContent = "登录";
      }
    });
  }
};
