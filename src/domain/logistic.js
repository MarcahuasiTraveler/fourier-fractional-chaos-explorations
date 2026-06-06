// Logistic map update: x_{n+1} = r * x_n * (1 - x_n)
// This gives a tiny deterministic chaotic signal per harmonic.
export function logisticStep(x, r) {
  return r * x * (1 - x);
}

export function createInitialLogisticStates(count, rng) {
  const values = new Array(count);
  for (let i = 0; i < count; i += 1) {
    values[i] = 0.05 + 0.9 * rng();
  }
  return values;
}

export function stepLogisticStates(states, r) {
  for (let i = 0; i < states.length; i += 1) {
    const next = logisticStep(states[i], r);
    states[i] = Number.isFinite(next) && next > 0 && next < 1 ? next : 0.5;
  }
}
