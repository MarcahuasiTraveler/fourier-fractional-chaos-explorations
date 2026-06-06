import { deepClone, deepFreeze } from '../utils/object.js';
import { FOURIER_K_MAX } from '../fourier.js';

export const DEFAULT_CONFIG = deepFreeze({
  seed: 666,

  canvas: { w: 4180, h: 2385 },
  render: { fps: 60, pixelDensity: 1, bg: [9, 11, 16] },
  view: { scale: 0.99, center: [0.5, 0.5] },

  fourier: {
    K: 2,
    KMin: 1,
    KMax: FOURIER_K_MAX,
    KStep: 4,
    baseAmp: 70,
    decay: 0,
    ampJitter: 1,
  },

  time: { step: 8, speed: 10005 },

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
      r: 3.5697,
      mix: 0,
    },
    gain: {
      amp: 32,
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

  runtime: {
    paused: false,
    chaosOn: true,
    fracOn: false,
    showDebugOverlay: false,
    showHarmonicsPanel: false,
  },
});

export function createConfig(base = DEFAULT_CONFIG) {
  return deepFreeze(deepClone(base));
}
