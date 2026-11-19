function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numberOr(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function liveScores(elapsedSec, gazeHits, breathCycles, motionIndex) {
  const duration = Math.max(1, numberOr(elapsedSec, 1));
  const focus = clamp(Math.round(100 - motionIndex * 1.2 + gazeHits * 1.5), 0, 100);
  const relax = clamp(Math.round(100 - motionIndex * 1.5 + breathCycles * 1), 0, 100);
  const completion = clamp(Math.round((breathCycles * 19) / duration * 100), 0, 100);
  return {
    focus: focus,
    relax: relax,
    completion: completion,
    overall: Math.round(focus * 0.4 + relax * 0.35 + completion * 0.25)
  };
}

function apply(session, body) {
  const elapsedSec = Math.max(0, Math.round(numberOr(body.elapsedSec, session.elapsedSec)));
  const gazeHits = Math.max(0, Math.round(numberOr(body.gazeHits, session.metrics.gazeHits)));
  const breathCycles = Math.max(0, Math.round(numberOr(body.breathCycles, session.metrics.breathCycles)));
  const motionIndex = clamp(Math.round(numberOr(body.motionIndex, session.metrics.motionIndex)), 0, 100);
  session.elapsedSec = elapsedSec;
  session.metrics.gazeHits = gazeHits;
  session.metrics.breathCycles = breathCycles;
  session.metrics.motionIndex = motionIndex;
  const samples = session.samples || [];
  let sum = 0;
  samples.forEach(function (item) { sum += item.motionIndex; });
  if (samples.length) {
    session.metrics.avgMotion = Math.round((sum + motionIndex) / (samples.length + 1));
  } else {
    session.metrics.avgMotion = motionIndex;
  }
  const scores = liveScores(elapsedSec, gazeHits, breathCycles, session.metrics.avgMotion);
  session.metrics.focusScore = scores.focus;
  session.metrics.relaxScore = scores.relax;
  session.metrics.completion = scores.completion;
  session.metrics.overall = scores.overall;
  session.metrics.phase = String(body.phase || session.metrics.phase || "");
  const last = samples.length ? samples[samples.length - 1].at : -5;
  if (elapsedSec - last >= 5) {
    samples.push({ at: elapsedSec, motionIndex: motionIndex, gazeHits: gazeHits, breathCycles: breathCycles, phase: session.metrics.phase });
    if (samples.length > 500) samples.splice(0, samples.length - 500);
  }
  session.samples = samples;
  return session;
}

function summary(session) {
  return {
    elapsedSec: session.elapsedSec,
    gazeHits: session.metrics.gazeHits,
    breathCycles: session.metrics.breathCycles,
    motionIndex: session.metrics.motionIndex,
    avgMotion: session.metrics.avgMotion,
    focusScore: session.metrics.focusScore,
    relaxScore: session.metrics.relaxScore,
    completion: session.metrics.completion,
    overall: session.metrics.overall,
    phase: session.metrics.phase || ""
  };
}

module.exports = {
  liveScores: liveScores,
  apply: apply,
  summary: summary
};
