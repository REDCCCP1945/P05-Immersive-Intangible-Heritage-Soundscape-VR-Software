const HelpView = {
  render: function (container) {
    container.innerHTML = UI.pageHead("帮助与合规", "体验规则、技术边界与常见问题") +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>体验流程</h3></div><div class="card-body">' +
      '<ol class="help-list"><li>在“体验者档案”建立匿名编码，填写年龄段与体验前压力自评。</li>' +
      '<li>在“会话与播控”选择体验者与主题，创建会话。</li>' +
      '<li>进入播控台，点击“打开体验端”，在新窗口点击“开始体验”。</li>' +
      '<li>体验端以呼吸球、音景与凝视目标引导；控制台同步查看指标。</li>' +
      '<li>结束后系统生成报告，可导出JSON或CSV。</li></ol></div></div>' +
      '<div class="card"><div class="card-head"><h3>技术边界</h3></div><div class="card-body">' +
      '<ul class="help-list"><li>本软件以浏览器Canvas与Web Audio实现本地沉浸式体验，不包含Unity、OpenXR与VR头显驱动。</li>' +
      '<li>空间声像由左右声道、距离衰减与音量参数合成，不包含HRTF双耳渲染与头部追踪。</li>' +
      '<li>控制台以状态同步展示场景缩略图与实时指标，不传输视频流。</li>' +
      '<li>体验记录保存在本机JSON文件，不使用SQLite与AES数据库加密。</li>' +
      '<li>软件不提供医疗诊断，不承诺治疗效果；如有严重不适，应停止使用并寻求专业帮助。</li></ul></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>常见问题</h3></div><div class="card-body">' +
      '<div class="faq"><strong>体验端没有声音？</strong><p>浏览器要求用户手势后才能播放音频，请点击体验端的“开始体验”按钮，并检查控制台音量与系统音量。</p></div>' +
      '<div class="faq"><strong>为什么综合分不高？</strong><p>综合分由专注、放松与完成度合成。视角移动过多会降低专注与放松分，呼吸周期不足会降低完成度。</p></div>' +
      '<div class="faq"><strong>能否恢复已中止的会话？</strong><p>不能。紧急停止会生成中止记录，如需继续应重新创建会话。</p></div>' +
      '<div class="faq"><strong>数据保存在哪里？</strong><p>保存在软件目录的data/db.json；备份时同时复制data目录与secret.key。</p></div>' +
      '<div class="faq"><strong>如何改变主题？</strong><p>管理员可在“疗愈主题”新增或编辑主题，被会话引用的主题只能停用，不能删除。</p></div>' +
      '</div></div>';
  }
};
App.register("help", HelpView);
