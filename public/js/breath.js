(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.Breath = api;
})(typeof self !== "undefined" ? self : this, function () {
  const CYCLE = 19;

  function phaseAt(seconds) {
    const value = Number(seconds) || 0;
    const t = ((value % CYCLE) + CYCLE) % CYCLE;
    if (t < 4) {
      return { t: t, phase: "吸气", scale: 0.6 + (t / 4) * 0.4 };
    }
    if (t < 11) {
      return { t: t, phase: "屏气", scale: 1 };
    }
    return { t: t, phase: "呼气", scale: 0.6 + ((CYCLE - t) / 8) * 0.4 };
  }

  function cyclesAt(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    return Math.floor(value / CYCLE);
  }

  return { CYCLE: CYCLE, phaseAt: phaseAt, cyclesAt: cyclesAt };
});
