export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(current, target, t) {
  return current + (target - current) * t;
}

export function tanh(value) {
  if (typeof Math.tanh === 'function') {
    return Math.tanh(value);
  }
  const exp = Math.exp(2 * value);
  return (exp - 1) / (exp + 1);
}

export function wrapAngle(value) {
  let wrapped = value % TAU;
  if (wrapped < 0) wrapped += TAU;
  return wrapped;
}
