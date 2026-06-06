import { TAU } from './utils/math.js';
import { randomBetween } from './utils/rng.js';

export const FOURIER_K_MAX = 10;

// Builds deterministic Fourier harmonics from a seeded RNG.
// Each harmonic carries fixed random twists so modulation can stay rich
// while keeping full reproducibility for a given seed.
export function createFourierCoefficients(fourierConfig, rng) {
  const count = Math.max(1, Math.min(FOURIER_K_MAX, Math.floor(fourierConfig.K)));
  const coefficients = [];

  for (let baseK = 1; baseK <= count; baseK += 1) {
    const envelope = fourierConfig.baseAmp * Math.pow(baseK, -fourierConfig.decay);
    for (const signedK of [baseK, -baseK]) {
      const jitter = 0.6 + fourierConfig.ampJitter * rng();
      coefficients.push({
        k: signedK,
        amp0: envelope * jitter,
        phi0: randomBetween(rng, 0, TAU),
        twist1: randomBetween(rng, 0, TAU),
        twist2: randomBetween(rng, 0, TAU),
        twist3: randomBetween(rng, 0, TAU),
      });
    }
  }

  return coefficients;
}
