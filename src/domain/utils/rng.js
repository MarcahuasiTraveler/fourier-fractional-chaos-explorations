// Deterministic pseudo-random generator (Mulberry32)
// Same input seed => same sequence, useful for reproducible experiments.
export function createSeededRng(seed) {
  let state = (seed >>> 0) || 1;

  return function next() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(rng, min, max) {
  return min + (max - min) * rng();
}

export function randomSign(rng) {
  return rng() < 0.5 ? -1 : 1;
}
