/*
Fourier + Fractional Chaos (Epicycles)
- Fractional-order Lorenz system (0 < alpha < 1) with short-memory GL method.
- Logistic micro-chaos per harmonic for fine-grain modulation.
- Epicycles visualize the Fourier sum as a chain of circles.
*/

let seed = 666; //22

const CFG = {
  canvas: { w: 1800, h: 1125 }, // { w: 2550, h: 1600 },
  render: { fps: 60, pixelDensity: 1, bg: [9, 11, 16] },
  view: { scale: 0.99, center: [0.5, 0.5] },

  fourier: {
    K: 10,
    KMin: 1,
    KMax: 500,
    KStep: 4,
    baseAmp: 92,
    decay: 0,
    ampJitter: 1,
  },

  time: { step: 8, speed: 10001 },

  trail: { max: 6000, stroke: [255, 255, 255], weight: 0.1, offscreen: true },

  epicycles: {
    show: false,
    circleStroke: [255, 255, 255, 255],
    linkStroke: [255, 255, 255, 255],
    tip: [255, 255, 255],
    tipSize: 5.5,
  },

  chaos: {
    frac: {
      alpha: 0.02,
      dt: 0.005,
      memory: 384,
      substeps: 36,
      sigma: 5,
      rho: 5,
      beta: 9 / 3,
      normScale: 33,
    },
    logistic: {
      r: 3.5697, // 3.8424 3.7442 usa 3.569945
      mix: 0 // 0..1 (0 = sin logística, 1 = full logística)
    },
    gain: {
      amp: 8,
      phase: 0.0,
    },
  },

  limits: {
    alphaMin: 0.001,
    alphaMax: 0.999,
    memMin: 1,
    memMax: 1000,
    speedMin: 0.1,
    speedMax: 30000.0,
    scaleMin: 0.002,
    scaleMax: 10.0,
  },
};

let center;
let K = CFG.fourier.K;
let scaleFac = CFG.view.scale;
let speed = CFG.time.speed;

let showEpicycles = true;
let showHelp = false;
let chaosOn = true;
let fracOn = false;
let paused = false;

let coeffs = [];
let logisticStates = [];
let t = 0;
let traceIteration = 0;

let lorenz = null;
let canvasRenderer = null;
let gainAmpSlider = null;
let gainPhaseSlider = null;
let runStartMillis = 0;
let pausedMillisAccum = 0;
let pauseStartedAt = null;

// --- auto-regen cada 60s ---
const AUTO_REGEN_MS = 100000;
let nextRegenAtMillis = null; // tiempo objetivo (en millis()) para la siguiente regeneración

let normEma = CFG.chaos.frac.normScale;

// logs
let showSpectrumLogs = true;
let specEnergyEma = 0; // smoothed total spectral energy (EMA)
let specEnergyPeak = 1e-6; // running peak for normalization

// paging for harmonics
let specStartIdx = 0; // 0-based index into coeffs[]
let specPageSize = 12; // will be auto-clamped by available panel height

let pathX = null;
let pathY = null;
let pathStart = 0; // logical index 0 (newest)
let pathSize = 0;
let pathMax = 0;

let trailGfx = null;
let trailLastScaleFac = null;
let trailLastCenterX = null;
let trailLastCenterY = null;

function setup() {
  canvasRenderer = createCanvas(CFG.canvas.w, CFG.canvas.h);
  pixelDensity(CFG.render.pixelDensity);
  frameRate(CFG.render.fps);
  center = createVector(
    width * CFG.view.center[0],
    height * CFG.view.center[1],
  );
  initPathRing(CFG.trail.max);
  initTrailGfx();
  initHelpControls();
  syncHelpUI();
  runStartMillis = millis();

  newGeneration(seed);
  nextRegenAtMillis = runStartMillis + AUTO_REGEN_MS;
}

function draw() {
  background(...CFG.render.bg);

  // Auto-regeneración: cuenta solo tiempo activo (no pausado)
  if (!paused && nextRegenAtMillis !== null && millis() >= nextRegenAtMillis) {
    seed++;
    newGeneration(seed);
  }

  if (!paused) {
    updateChaos();
  }

  const chaos = getChaosSignals();

  translate(center.x, center.y);
  scale(scaleFac);

  maybeRebuildTrailGfx();
  const p = computeAndMaybeDraw(t, chaos);

  if (!paused) {
    let prevX = null;
    let prevY = null;
    if (pathSize > 0) {
      prevX = pathX[pathStart];
      prevY = pathY[pathStart];
    }
    pushPath(p.x, p.y);
    if (CFG.trail.offscreen && trailGfx && prevX !== null) {
      drawTrailSegmentGfx(prevX, prevY, p.x, p.y);
    }
    traceIteration++;
  }

  drawTrail();

  if (!paused) {
    t = (t + CFG.time.step * speed) % TWO_PI;
  }

  if (showHelp) {
    layoutHelpControls();
    CFG.chaos.gain.amp = gainAmpSlider.value();
    CFG.chaos.gain.phase = gainPhaseSlider.value();
    drawHUD(chaos);
    drawSpectrumPanel(chaos);
  }
}

function initHelpControls() {
  gainAmpSlider = createSlider(0, 100, CFG.chaos.gain.amp, 0.01);
  gainPhaseSlider = createSlider(0, 1, CFG.chaos.gain.phase, 0.01);
  gainAmpSlider.style("width", "220px");
  gainPhaseSlider.style("width", "220px");
}

function syncHelpUI() {
  if (!gainAmpSlider || !gainPhaseSlider) return;

  if (showHelp) {
    gainAmpSlider.show();
    gainPhaseSlider.show();
    layoutHelpControls();
  } else {
    gainAmpSlider.hide();
    gainPhaseSlider.hide();
  }
}

function layoutHelpControls() {
  if (!canvasRenderer || !gainAmpSlider || !gainPhaseSlider) return;

  const rect = canvasRenderer.elt.getBoundingClientRect();
  const ox = rect.left + window.scrollX;
  const oy = rect.top + window.scrollY;
  gainAmpSlider.position(225 + ox, 192 + oy);
  gainPhaseSlider.position(225 + ox, 222 + oy);
}

function newGeneration(s) {
  seed = s;
  randomSeed(seed);
  noiseSeed(seed);

  coeffs = [];
  logisticStates = [];
  t = 0;
  traceIteration = 0;
  clearPath();
  clearTrailGfx();

  for (let i = 1; i <= K; i++) {
    const env = CFG.fourier.baseAmp * Math.pow(i, -CFG.fourier.decay);
    for (const sign of [1, -1]) {
      const amp0 = env * (0.6 + CFG.fourier.ampJitter * random());
      const phi0 = random(TWO_PI);

      coeffs.push({
        k: i,
        sign,
        amp0,
        phi0,
        twist1: random(TWO_PI),
        twist2: random(TWO_PI),
        twist3: random(TWO_PI),
      });

      logisticStates.push(random(0.05, 0.95));
    }
  }

  resetChaos();

  // Reinicia contador de auto-regen desde ahora
  nextRegenAtMillis = millis() + AUTO_REGEN_MS;
}

function initPathRing(maxPoints) {
  pathMax = Math.max(1, Math.floor(maxPoints));
  pathX = new Float32Array(pathMax);
  pathY = new Float32Array(pathMax);
  pathStart = 0;
  pathSize = 0;
}

function clearPath() {
  pathStart = 0;
  pathSize = 0;
}

function pushPath(x, y) {
  // Insert newest at logical index 0; overwrite oldest when full.
  pathStart = (pathStart - 1 + pathMax) % pathMax;
  pathX[pathStart] = x;
  pathY[pathStart] = y;
  if (pathSize < pathMax) pathSize++;
}

function initTrailGfx() {
  if (!CFG.trail.offscreen) return;
  trailGfx = createGraphics(CFG.canvas.w, CFG.canvas.h);
  trailGfx.pixelDensity(CFG.render.pixelDensity);
  trailGfx.clear();
  trailLastScaleFac = scaleFac;
  trailLastCenterX = center.x;
  trailLastCenterY = center.y;
}

function clearTrailGfx() {
  if (!trailGfx) return;
  trailGfx.clear();
}

function maybeRebuildTrailGfx() {
  if (!CFG.trail.offscreen || !trailGfx) return;

  const scaleChanged =
    trailLastScaleFac === null
      ? true
      : Math.abs(scaleFac - trailLastScaleFac) > 1e-9;
  const centerChanged =
    trailLastCenterX === null ||
    trailLastCenterY === null ||
    Math.abs(center.x - trailLastCenterX) > 1e-9 ||
    Math.abs(center.y - trailLastCenterY) > 1e-9;

  if (!scaleChanged && !centerChanged) return;

  trailLastScaleFac = scaleFac;
  trailLastCenterX = center.x;
  trailLastCenterY = center.y;

  rebuildTrailGfxFromPath();
}

function rebuildTrailGfxFromPath() {
  if (!trailGfx) return;

  trailGfx.clear();
  if (pathSize < 2) return;

  trailGfx.noFill();
  trailGfx.stroke(...CFG.trail.stroke);
  trailGfx.strokeWeight(CFG.trail.weight);

  for (let i = 0; i < pathSize - 1; i++) {
    const a = (pathStart + i) % pathMax;
    const b = (pathStart + i + 1) % pathMax;
    drawTrailSegmentGfx(pathX[a], pathY[a], pathX[b], pathY[b]);
  }
}

function drawTrailSegmentGfx(x0, y0, x1, y1) {
  if (!trailGfx) return;

  const sx0 = center.x + x0 * scaleFac;
  const sy0 = center.y + y0 * scaleFac;
  const sx1 = center.x + x1 * scaleFac;
  const sy1 = center.y + y1 * scaleFac;

  trailGfx.stroke(...CFG.trail.stroke);
  trailGfx.strokeWeight(CFG.trail.weight);
  trailGfx.line(sx0, sy0, sx1, sy1);
}

function resetChaos() {
  const cfg = CFG.chaos.frac;
  const x0 = random(-6, 6);
  const y0 = random(-6, 6);
  const z0 = random(8, 18);
  lorenz = new FracLorenz(
    cfg.alpha,
    cfg.dt,
    cfg.memory,
    cfg.sigma,
    cfg.rho,
    cfg.beta,
    x0,
    y0,
    z0,
  );
  normEma = CFG.chaos.frac.normScale;
}

class FracLorenz {
  constructor(alpha, dt, memory, sigma, rho, beta, x0, y0, z0) {
    this.setParams(alpha, dt, memory, sigma, rho, beta);
    this.reset(x0, y0, z0);
  }

  setParams(alpha, dt, memory, sigma, rho, beta) {
    this.alpha = alpha;
    this.dt = dt;
    this.memory = memory;
    this.sigma = sigma;
    this.rho = rho;
    this.beta = beta;
    this.hAlpha = Math.pow(this.dt, this.alpha);
    this.coeffs = this.buildCoeffs(this.memory, this.alpha);
  }

  reset(x0, y0, z0) {
    this.xHist = [x0];
    this.yHist = [y0];
    this.zHist = [z0];
  }

  buildCoeffs(m, a) {
    const c = new Array(m + 1);
    c[0] = 1;
    for (let k = 1; k <= m; k++) {
      c[k] = (1 - (1 + a) / k) * c[k - 1];
    }
    return c;
  }

  step() {
    const x0 = this.xHist[0];
    const y0 = this.yHist[0];
    const z0 = this.zHist[0];

    const fx = this.sigma * (y0 - x0);
    const fy = x0 * (this.rho - z0) - y0;
    const fz = x0 * y0 - this.beta * z0;

    const m = Math.min(this.memory, this.xHist.length);

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    for (let k = 1; k <= m; k++) {
      const ck = this.coeffs[k];
      sumX += ck * this.xHist[k - 1];
      sumY += ck * this.yHist[k - 1];
      sumZ += ck * this.zHist[k - 1];
    }

    const x1 = this.hAlpha * fx - sumX;
    const y1 = this.hAlpha * fy - sumY;
    const z1 = this.hAlpha * fz - sumZ;

    this.xHist.unshift(x1);
    this.yHist.unshift(y1);
    this.zHist.unshift(z1);

    if (this.xHist.length > this.memory) this.xHist.pop();
    if (this.yHist.length > this.memory) this.yHist.pop();
    if (this.zHist.length > this.memory) this.zHist.pop();
  }

  get state() {
    return { x: this.xHist[0], y: this.yHist[0], z: this.zHist[0] };
  }
}

function updateChaos() {
  if (!chaosOn) return;

  // --- Frac Lorenz (solo si fracOn) ---
  if (fracOn) {
    for (let i = 0; i < CFG.chaos.frac.substeps; i++) {
      lorenz.step();
    }

    const st = lorenz.state;
    if (
      !isFinite(st.x) ||
      !isFinite(st.y) ||
      !isFinite(st.z) ||
      Math.abs(st.x) > 1e6 ||
      Math.abs(st.y) > 1e6 ||
      Math.abs(st.z) > 1e6
    ) {
      resetChaos();
    }
  }

  // --- Logistic map (SIEMPRE, mientras chaosOn) ---
  for (let i = 0; i < logisticStates.length; i++) {
    let x = logisticStates[i];
    x = logisticStep(x, CFG.chaos.logistic.r);
    if (!isFinite(x) || x <= 0 || x >= 1) x = 0.5;
    logisticStates[i] = x;
  }
}

function logisticStep(x, r) {
  return r * x * (1 - x);
}

function getChaosSignals() {
  // Si no hay caos global, devuelve neutro total
  if (!chaosOn) {
    return { nx: 0, ny: 0, nz: 0, raw: null, norm: 0 };
  }

  // Si fraccional está bypass, devolvemos neutro para Lorenz
  // (la logística sigue afectando vía harmonicMod)
  if (!fracOn) {
    return { nx: 0, ny: 0, nz: 0, raw: null, norm: 0 };
  }

  const st = lorenz.state;
  const base = CFG.chaos.frac.normScale;
  const absMax = Math.max(Math.abs(st.x), Math.abs(st.y), Math.abs(st.z));
  const target = Math.max(base, absMax / 1.35);
  normEma = lerp(normEma, target, 0.02);
  const s = Math.max(1e-6, normEma);
  const nx = tanh(st.x / s);
  const ny = tanh(st.y / s);
  const nz = tanh(st.z / s);
  return { nx, ny, nz, raw: st, norm: s };
}

function computeAndMaybeDraw(tt, chaos) {
  let vx = 0;
  let vy = 0;

  if (showEpicycles) {
    noFill();
  }

  for (let i = 0; i < coeffs.length; i++) {
    const h = coeffs[i];
    const mod = harmonicMod(h, i, chaos);

    const amp = h.amp0 * (1 + CFG.chaos.gain.amp * (mod.ampMul - 1));
    const phi = h.phi0 + CFG.chaos.gain.phase * mod.phase;
    const ang = h.sign * h.k * tt + phi;

    if (showEpicycles) {
      stroke(...CFG.epicycles.circleStroke);
      ellipse(vx, vy, amp * 2, amp * 2);
    }

    const nx = vx + amp * Math.cos(ang);
    const ny = vy + amp * Math.sin(ang);

    if (showEpicycles) {
      stroke(...CFG.epicycles.linkStroke);
      line(vx, vy, nx, ny);
    }

    vx = nx;
    vy = ny;
  }

  if (showEpicycles) {
    noStroke();
    fill(...CFG.epicycles.tip);
    circle(vx, vy, CFG.epicycles.tipSize / scaleFac);
  }

  return createVector(vx, vy);
}

function harmonicMod(h, idx, chaos) {
  if (!chaosOn) return { ampMul: 1.0, phase: 0.0 };

  const k = h.k;
  const nx = chaos.nx;
  const ny = chaos.ny;
  const nz = chaos.nz;

  const u = 0.5 + 0.5 * Math.sin(nx * 2.2 + ny * 1.1 + k * 0.19 + h.twist1);
  const v = 0.5 + 0.5 * Math.sin(ny * 2.0 - nz * 1.3 - k * 0.17 + h.twist2);
  const w = 0.5 + 0.5 * Math.sin(nz * 2.1 + nx * 1.4 + k * 0.13 + h.twist3);

  let ampMul = 0.35 + 1.15 * (0.45 * u + 0.35 * v + 0.2 * w);
  let phase = TWO_PI * (0.55 * u - 0.35 * v + 0.25 * w - 0.2);

  const lx = logisticStates[idx];
  const mix = CFG.chaos.logistic.mix ?? 1.0;
  ampMul *= 1.0 + mix * (0.75 + 0.6 * lx - 1.0);
  phase += mix * (lx - 0.5) * 0.45 * TWO_PI;

  return { ampMul, phase };
}

function drawTrail() {
  if (CFG.trail.offscreen && trailGfx) {
    push();
    resetMatrix();
    image(trailGfx, 0, 0);
    pop();
    return;
  }

  noFill();
  stroke(...CFG.trail.stroke);
  strokeWeight(CFG.trail.weight / scaleFac);

  beginShape();
  for (let i = 0; i < pathSize; i++) {
    const idx = (pathStart + i) % pathMax;
    vertex(pathX[idx], pathY[idx]);
  }
  endShape();
}

function drawHUD(chaos) {
  resetMatrix();

  const boxW = 560;
  const boxH = 260;
  noStroke();
  fill(240, 240, 240, 230);
  rect(12, 12, boxW, boxH, 10);

  fill(15);
  textFont("monospace");
  textSize(12);
  textStyle(BOLD);
  text("Fourier + Frac Chaos (Epicycles)", 24, 32);
  textStyle(NORMAL);

  text(
    "N: new seed | C: chaos ON/OFF | E: epicycles ON/OFF | R: reset trail\n" +
      "[/]: harmonics -/+ | 1..5: logistic r presets\n" +
      "A/Z: alpha +/- | M/L: memory -/+ | \u2190/\u2192 speed | \u2191/\u2193 scale\n" +
      "P: pause | S: save PNG | H: help",
    24,
    54,
  );

  const cfg = CFG.chaos.frac;
  const status =
    `seed=${seed}  K=±${K}  r=${nf(CFG.chaos.logistic.r, 1, 3)}  ` +
    `alpha=${nf(cfg.alpha, 1, 2)}  mem=${cfg.memory}  ` +
    `speed=${nf(speed, 1, 2)}  scale=${nf(scaleFac, 1, 2)}  chaos=${chaosOn ? "ON" : "OFF"}`;

  text(status, 24, 132);
  text(
    `gain amp=${nf(CFG.chaos.gain.amp, 1, 2)}  gain phase=${nf(CFG.chaos.gain.phase, 1, 2)}`,
    24,
    154,
  );
  text(
    "Experimentos: phase=0 amp=1 (orden) | phase=1 amp=0 (torsion)",
    24,
    174,
  );
  text("Barrido: amp=0.30 y phase 0.00..1.00 en pasos de 0.10", 24, 192);
  text("Gain amp (caos por amplitud):", 24, 210);
  text("Gain phase (caos por fase):", 24, 240);

  drawRuntimeHUD();
}

function drawRuntimeHUD() {
  const runBoxW = 300;
  const runBoxH = 84;
  const runX = 12;
  const runYBottom = height - runBoxH - 12;
  const runYTopSafe = 12 + 260 + 12; // justo debajo del HUD principal
  const viewportH = Math.min(height, windowHeight || height);
  const runYVisibleBottom = viewportH - runBoxH - 12;
  const runY = constrain(runYVisibleBottom, runYTopSafe, runYBottom);
  const elapsedText = formatElapsed(getElapsedMillis());
  const traceText = `# trazo/iteracion: ${traceIteration}`;

  noStroke();
  fill(240, 240, 240, 230);
  rect(runX, runY, runBoxW, runBoxH, 10);

  fill(15);
  textSize(17);
  text(`Tiempo: ${elapsedText}`, runX + 12, runY + 34);
  text(traceText, runX + 12, runY + 62);
}

function computeSpectralStats(chaos) {
  // Energy definition: E = Σ A_k(t)^2, where A_k(t) includes chaos modulation.
  let E = 0;
  for (let i = 0; i < coeffs.length; i++) {
    const h = coeffs[i];
    const mod = harmonicMod(h, i, chaos);
    const amp = h.amp0 * (1 + CFG.chaos.gain.amp * (mod.ampMul - 1));
    E += amp * amp;
  }

  specEnergyEma = lerp(specEnergyEma, E, 0.08);
  specEnergyPeak = Math.max(specEnergyPeak * 0.999, specEnergyEma, 1e-6);
  return { E, Eema: specEnergyEma, Epeak: specEnergyPeak };
}

function drawSpectrumPanel(chaos) {
  if (!showSpectrumLogs) return;

  resetMatrix();

  const panelW = 560;
  const panelH = 360;
  const panelX = width - panelW - 12;
  const panelY = 12;
  const padX = 16;
  const headerH = 26;
  const lineH = 14;
  const footerH = 20; // reserved area at bottom
  const sectionGap = 10;

  // Background
  noStroke();
  fill(20, 22, 30, 240);
  rect(panelX, panelY, panelW, panelH, 12);

  // Header
  fill(235);
  textFont("monospace");
  textSize(12);
  textStyle(BOLD);
  text("FOURIER SPECTRAL MONITOR", panelX + padX, panelY + 20);
  textStyle(NORMAL);

  let y = panelY + headerH + 18;

  // ---- Chaos signals ----
  fill(200);
  text("getChaosSignals()", panelX + padX, y);
  y += 16;
  fill(235);
  text(
    `nx=${nf(chaos.nx, 1, 3)} ny=${nf(chaos.ny, 1, 3)} nz=${nf(chaos.nz, 1, 3)} ` +
      `norm=${nf(chaos.norm ?? 0, 1, 2)} frac=${fracOn ? "ON" : "OFF"}`,
    panelX + padX,
    y,
  );
  y += 16 + sectionGap;

  // ---- Energy ----
  const stats = computeSpectralStats(chaos);
  fill(200);
  text("Total spectral energy E = Σ A_k(t)^2", panelX + padX, y);
  y += 16;
  fill(235);
  text(
    `E=${nf(stats.E, 1, 2)} E(ema)=${nf(stats.Eema, 1, 2)} peak=${nf(stats.Epeak, 1, 2)}`,
    panelX + padX,
    y,
  );

  // Energy bar
  const barX = panelX + padX;
  const barY = y + 6;
  const barW = panelW - padX * 2;
  const barH = 10;
  const eNorm = constrain(stats.Eema / stats.Epeak, 0, 1);
  noStroke();
  fill(60, 70, 95, 220);
  rect(barX, barY, barW, barH, 6);
  fill(255, 210, 70, 230);
  rect(barX, barY, barW * eNorm, barH, 6);
  y += 16 + sectionGap + 10;

  // ---- Harmonics snapshot ----
  fill(200);
  text("Harmonics snapshot (paged)", panelX + padX, y);
  y += 16;

  // Compute how many lines actually fit (prevents overlap with footer)
  const footerY = panelY + panelH - 10;
  const usableBottom = footerY - footerH;
  const linesFit = Math.max(1, Math.floor((usableBottom - y) / lineH));
  const pageN = Math.min(specPageSize, linesFit);

  const N = coeffs.length;
  if (N <= 0) return;

  // Clamp start index
  specStartIdx = constrain(specStartIdx, 0, Math.max(0, N - 1));
  if (specStartIdx > Math.max(0, N - pageN))
    specStartIdx = Math.max(0, N - pageN);

  const endIdx = Math.min(N, specStartIdx + pageN);

  // Page indicator
  fill(170);
  text(
    `showing ${specStartIdx + 1}-${endIdx} of ${N} (|k|<=${K})`,
    panelX + padX,
    y,
  );
  y += 16;

  // Logs
  fill(235);
  for (let i = specStartIdx; i < endIdx; i++) {
    const h = coeffs[i];
    const mod = harmonicMod(h, i, chaos);
    const amp = h.amp0 * (1 + CFG.chaos.gain.amp * (mod.ampMul - 1));
    const phi = h.phi0 + CFG.chaos.gain.phase * mod.phase;
    const lx = logisticStates[i];
    const kLabel = `${h.sign > 0 ? "+" : "-"}${nf(h.k, 2, 0)}`;

    text(
      `k=${kLabel} A=${nf(amp, 1, 2)} φ=${nf(phi, 1, 2)} ` +
        `ampMul=${nf(mod.ampMul, 1, 3)} lx=${nf(lx, 1, 3)}`,
      panelX + padX,
      y,
    );
    y += lineH;
  }

  // Footer (fixed, never overlaps)
  fill(170);
  text("T: toggle  F: frac  ,/. : page  wheel: page", panelX + padX, footerY);
}

function getElapsedMillis() {
  const now = millis();
  const pausedNow =
    paused && pauseStartedAt !== null ? now - pauseStartedAt : 0;
  return Math.max(0, now - runStartMillis - pausedMillisAccum - pausedNow);
}

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  return `${nf(hh, 2)}:${nf(mm, 2)}:${nf(ss, 2)}`;
}

function tanh(x) {
  if (Math.tanh) return Math.tanh(x);
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

function rebuildLorenzKeepState() {
  const st = lorenz ? lorenz.state : { x: 0, y: 1, z: 1 };
  const cfg = CFG.chaos.frac;
  lorenz = new FracLorenz(
    cfg.alpha,
    cfg.dt,
    cfg.memory,
    cfg.sigma,
    cfg.rho,
    cfg.beta,
    st.x,
    st.y,
    st.z,
  );
}

function adjustAlpha(delta) {
  const cfg = CFG.chaos.frac;
  cfg.alpha = constrain(
    cfg.alpha + delta,
    CFG.limits.alphaMin,
    CFG.limits.alphaMax,
  );
  rebuildLorenzKeepState();
}

function adjustMemory(delta) {
  const cfg = CFG.chaos.frac;
  cfg.memory = Math.floor(
    constrain(cfg.memory + delta, CFG.limits.memMin, CFG.limits.memMax),
  );
  rebuildLorenzKeepState();
}

function togglePause() {
  if (!paused) {
    paused = true;
    pauseStartedAt = millis();
    return;
  }

  paused = false;
  if (pauseStartedAt !== null) {
    const pausedDelta = millis() - pauseStartedAt;
    pausedMillisAccum += pausedDelta;

    // Mueve el deadline de regen hacia adelante por el tiempo pausado
    if (nextRegenAtMillis !== null) nextRegenAtMillis += pausedDelta;

    pauseStartedAt = null;
  }
}

function keyPressed() {
  if (key === "N" || key === "n") {
    seed++;
    newGeneration(seed);
  } else if (key === "C" || key === "c") {
    chaosOn = !chaosOn;
  } else if (key === "F" || key === "f") {
    fracOn = !fracOn;
  } else if (key === "E" || key === "e") {
    showEpicycles = !showEpicycles;
  } else if (key === "R" || key === "r") {
    clearPath();
    clearTrailGfx();
    traceIteration = 0;
  } else if (key === "[") {
    K = Math.max(CFG.fourier.KMin, K - CFG.fourier.KStep);
    newGeneration(seed);
  } else if (key === "]") {
    K = Math.min(CFG.fourier.KMax, K + CFG.fourier.KStep);
    newGeneration(seed);
  } else if (key === "1") {
    CFG.chaos.logistic.r = 3.5;
  } else if (key === "2") {
    CFG.chaos.logistic.r = 3.7;
  } else if (key === "3") {
    CFG.chaos.logistic.r = 3.85;
  } else if (key === "4") {
    CFG.chaos.logistic.r = 3.95;
  } else if (key === "5") {
    CFG.chaos.logistic.r = 3.999;
  } else if (key === "T" || key === "t") {
    showSpectrumLogs = !showSpectrumLogs;
  } else if (key === "," || key === "<") {
    const step = Math.max(1, Math.floor(specPageSize * 0.75));
    specStartIdx = constrain(
      specStartIdx - step,
      0,
      Math.max(0, coeffs.length - 1),
    );
  } else if (key === "." || key === ">") {
    const step = Math.max(1, Math.floor(specPageSize * 0.75));
    specStartIdx = constrain(
      specStartIdx + step,
      0,
      Math.max(0, coeffs.length - 1),
    );
  } else if (keyCode === LEFT_ARROW) {
    speed = Math.max(CFG.limits.speedMin, speed - 0.2);
  } else if (keyCode === RIGHT_ARROW) {
    speed = Math.min(CFG.limits.speedMax, speed + 0.2);
  } else if (keyCode === UP_ARROW) {
    scaleFac = Math.min(CFG.limits.scaleMax, scaleFac + 0.05);
  } else if (keyCode === DOWN_ARROW) {
    scaleFac = Math.max(CFG.limits.scaleMin, scaleFac - 0.05);
  } else if (key === "S" || key === "s") {
    saveCanvas("fourier_frac_chaos", "png");
  } else if (key === "H" || key === "h") {
    showHelp = !showHelp;
    syncHelpUI();
  } else if (key === "P" || key === "p") {
    togglePause();
  } else if (key === "A" || key === "a") {
    adjustAlpha(0.02);
  } else if (key === "Z" || key === "z") {
    adjustAlpha(-0.02);
  } else if (key === "M" || key === "m") {
    adjustMemory(-20);
  } else if (key === "L" || key === "l") {
    adjustMemory(20);
  }
}

function mouseWheel(event) {
  if (!showHelp || !showSpectrumLogs) return;
  const dir = event.deltaY > 0 ? 1 : -1;
  const step = Math.max(1, Math.floor(specPageSize * 0.75));
  specStartIdx = constrain(
    specStartIdx + dir * step,
    0,
    Math.max(0, coeffs.length - 1),
  );
  return false;
}
