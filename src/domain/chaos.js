import { TAU } from './utils/math.js';

// Harmonic modulation blends smooth trigonometric coupling with per-band
// logistic micro-chaos. This remains deterministic because both inputs are deterministic.
export function computeHarmonicModulation(harmonic, index, chaosSignals, logisticState, mix) {
  const k = Math.abs(harmonic.k);
  const nx = chaosSignals.nx;
  const ny = chaosSignals.ny;
  const nz = chaosSignals.nz;

  const u = 0.5 + 0.5 * Math.sin(nx * 2.2 + ny * 1.1 + k * 0.19 + harmonic.twist1);
  const v = 0.5 + 0.5 * Math.sin(ny * 2.0 - nz * 1.3 - k * 0.17 + harmonic.twist2);
  const w = 0.5 + 0.5 * Math.sin(nz * 2.1 + nx * 1.4 + k * 0.13 + harmonic.twist3);

  let ampMul = 0.35 + 1.15 * (0.45 * u + 0.35 * v + 0.2 * w);
  let phase = TAU * (0.55 * u - 0.35 * v + 0.25 * w - 0.2);

  const logisticMix = mix ?? 1.0;
  ampMul *= 1.0 + logisticMix * (0.75 + 0.6 * logisticState - 1.0);
  phase += logisticMix * (logisticState - 0.5) * 0.45 * TAU;

  return { ampMul, phase, index };
}
