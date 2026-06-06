import p5 from 'p5';

function createTrailRing(maxPoints) {
  const max = Math.max(1, Math.floor(maxPoints));
  return {
    x: new Float32Array(max),
    y: new Float32Array(max),
    max,
    head: 0,
    size: 0,
  };
}

function clearTrailRing(ring) {
  ring.head = 0;
  ring.size = 0;
}

function pushTrailPoint(ring, x, y) {
  ring.x[ring.head] = x;
  ring.y[ring.head] = y;
  ring.head = (ring.head + 1) % ring.max;
  if (ring.size < ring.max) ring.size += 1;
}

function getNewestPoint(ring) {
  if (ring.size === 0) return null;
  const idx = (ring.head - 1 + ring.max) % ring.max;
  return { x: ring.x[idx], y: ring.y[idx] };
}

function iterateTrailPoints(ring, visitor) {
  if (ring.size === 0) return;
  const start = (ring.head - ring.size + ring.max) % ring.max;
  for (let i = 0; i < ring.size; i += 1) {
    const idx = (start + i) % ring.max;
    visitor(ring.x[idx], ring.y[idx], i);
  }
}

function rebuildTrailLayer(state, center, scale, cfg) {
  if (!state.trailLayer) return;

  state.trailLayer.clear();
  if (state.trailRing.size < 2) return;

  state.trailLayer.noFill();
  state.trailLayer.stroke(...cfg.trail.stroke);
  state.trailLayer.strokeWeight(cfg.trail.weight);

  let last = null;
  iterateTrailPoints(state.trailRing, (x, y) => {
    if (!last) {
      last = { x, y };
      return;
    }

    state.trailLayer.line(
      center.x + last.x * scale,
      center.y + last.y * scale,
      center.x + x * scale,
      center.y + y * scale,
    );

    last = { x, y };
  });
}

function drawDirectTrail(p, ring, scale, cfg) {
  if (ring.size < 2) return;

  p.noFill();
  p.stroke(...cfg.trail.stroke);
  p.strokeWeight(cfg.trail.weight / Math.max(scale, 1e-6));
  p.beginShape();
  iterateTrailPoints(ring, (x, y) => {
    p.vertex(x, y);
  });
  p.endShape();
}

function drawEpicycles(p, snapshot, cfg, scale) {
  if (!cfg.epicycles.show) return;

  p.noFill();
  p.stroke(...cfg.epicycles.circleStroke);

  for (const segment of snapshot.chain) {
    p.ellipse(segment.x0, segment.y0, segment.amp * 2, segment.amp * 2);
    p.stroke(...cfg.epicycles.linkStroke);
    p.line(segment.x0, segment.y0, segment.x1, segment.y1);
    p.stroke(...cfg.epicycles.circleStroke);
  }

  p.noStroke();
  p.fill(...cfg.epicycles.tip);
  p.circle(snapshot.point.x, snapshot.point.y, cfg.epicycles.tipSize / Math.max(scale, 1e-6));
}

function drawDebugOverlay(p, snapshot) {
  const lines = [
    `frame=${snapshot.frame}`,
    `chaos nx=${snapshot.chaos.nx.toFixed(3)} ny=${snapshot.chaos.ny.toFixed(3)} nz=${snapshot.chaos.nz.toFixed(3)}`,
    `energy ema=${snapshot.spectral.ema.toFixed(2)} peak=${snapshot.spectral.peak.toFixed(2)} norm=${snapshot.spectral.normalized.toFixed(3)}`,
  ];

  p.push();
  p.resetMatrix();
  p.noStroke();
  p.fill(240, 240, 240, 220);
  p.rect(12, 12, 560, 84, 8);
  p.fill(10);
  p.textFont('monospace');
  p.textSize(12);
  lines.forEach((line, index) => {
    p.text(line, 24, 34 + index * 20);
  });
  p.pop();
}

export function createP5Sketch({ engine, onSnapshot, apiRef }) {
  return function sketch(p) {
    const state = {
      trailRing: null,
      trailLayer: null,
      lastFrame: 0,
      lastScale: null,
      lastCenterX: null,
      lastCenterY: null,
      lastCanvasW: null,
      lastCanvasH: null,
      lastPixelDensity: null,
      lastTrailPixelDensity: null,
      lastFps: null,
      pendingTrailReset: false,
    };

    const ensureCanvas = (cfg) => {
      if (state.lastCanvasW !== cfg.canvas.w || state.lastCanvasH !== cfg.canvas.h) {
        if (state.lastCanvasW == null) {
          p.createCanvas(cfg.canvas.w, cfg.canvas.h);
        } else {
          p.resizeCanvas(cfg.canvas.w, cfg.canvas.h);
        }
        state.lastCanvasW = cfg.canvas.w;
        state.lastCanvasH = cfg.canvas.h;
        state.pendingTrailReset = true;
      }

      if (state.lastPixelDensity !== cfg.render.pixelDensity) {
        p.pixelDensity(cfg.render.pixelDensity);
        state.lastPixelDensity = cfg.render.pixelDensity;
        state.pendingTrailReset = true;
      }

      if (state.lastFps !== cfg.render.fps) {
        p.frameRate(cfg.render.fps);
        state.lastFps = cfg.render.fps;
      }
    };

    const ensureTrail = (cfg) => {
      if (!state.trailRing || state.trailRing.max !== cfg.trail.max) {
        state.trailRing = createTrailRing(cfg.trail.max);
        state.pendingTrailReset = true;
      }

      if (cfg.trail.offscreen) {
        if (!state.trailLayer) {
          state.trailLayer = p.createGraphics(cfg.canvas.w, cfg.canvas.h);
          state.trailLayer.pixelDensity(cfg.render.pixelDensity);
          state.lastTrailPixelDensity = cfg.render.pixelDensity;
          state.pendingTrailReset = true;
        }

        if (
          state.trailLayer.width !== cfg.canvas.w ||
          state.trailLayer.height !== cfg.canvas.h ||
          state.lastTrailPixelDensity !== cfg.render.pixelDensity
        ) {
          state.trailLayer = p.createGraphics(cfg.canvas.w, cfg.canvas.h);
          state.trailLayer.pixelDensity(cfg.render.pixelDensity);
          state.lastTrailPixelDensity = cfg.render.pixelDensity;
          state.pendingTrailReset = true;
        }
      } else {
        state.trailLayer = null;
        state.lastTrailPixelDensity = null;
      }
    };

    const resetTrail = () => {
      if (state.trailRing) {
        clearTrailRing(state.trailRing);
      }
      if (state.trailLayer) {
        state.trailLayer.clear();
      }
    };

    p.setup = () => {
      const cfg = engine.getConfig();
      ensureCanvas(cfg);
      ensureTrail(cfg);

      if (apiRef) {
        apiRef.current = {
          exportPng: (name = 'fourier_fractional_chaos') => p.saveCanvas(name, 'png'),
          clearTrail: () => {
            resetTrail();
          },
        };
      }
    };

    p.draw = () => {
      const cfg = engine.getConfig();
      ensureCanvas(cfg);
      ensureTrail(cfg);

      const center = {
        x: p.width * cfg.view.center[0],
        y: p.height * cfg.view.center[1],
      };

      const snapshot = engine.stepFrame();

      if (snapshot.frame < state.lastFrame || state.pendingTrailReset) {
        resetTrail();
      }

      if (snapshot.advanced) {
        const prev = getNewestPoint(state.trailRing);
        pushTrailPoint(state.trailRing, snapshot.point.x, snapshot.point.y);

        if (cfg.trail.offscreen && state.trailLayer && prev) {
          state.trailLayer.stroke(...cfg.trail.stroke);
          state.trailLayer.strokeWeight(cfg.trail.weight);
          state.trailLayer.line(
            center.x + prev.x * cfg.view.scale,
            center.y + prev.y * cfg.view.scale,
            center.x + snapshot.point.x * cfg.view.scale,
            center.y + snapshot.point.y * cfg.view.scale,
          );
        }
      }

      const scaleChanged = state.lastScale !== cfg.view.scale;
      const centerChanged =
        state.lastCenterX !== center.x || state.lastCenterY !== center.y;

      if (cfg.trail.offscreen && state.trailLayer && (scaleChanged || centerChanged || state.pendingTrailReset)) {
        rebuildTrailLayer(state, center, cfg.view.scale, cfg);
      }

      p.background(...cfg.render.bg);

      p.push();
      p.translate(center.x, center.y);
      p.scale(cfg.view.scale);

      drawEpicycles(p, snapshot, cfg, cfg.view.scale);

      if (!cfg.trail.offscreen) {
        drawDirectTrail(p, state.trailRing, cfg.view.scale, cfg);
      }

      p.pop();

      if (cfg.trail.offscreen && state.trailLayer) {
        p.image(state.trailLayer, 0, 0);
      }

      if (cfg.runtime.showDebugOverlay) {
        drawDebugOverlay(p, snapshot);
      }

      state.lastScale = cfg.view.scale;
      state.lastCenterX = center.x;
      state.lastCenterY = center.y;
      state.lastFrame = snapshot.frame;
      state.pendingTrailReset = false;

      if (typeof onSnapshot === 'function') {
        onSnapshot(snapshot);
      }
    };

    p.remove = ((originalRemove) => {
      return () => {
        if (apiRef) {
          apiRef.current = null;
        }
        originalRemove.call(p);
      };
    })(p.remove);
  };
}

export function createP5Instance(host, sketch) {
  return new p5(sketch, host);
}
