import { randomBetween } from './utils/rng.js';

// Fractional-order Lorenz integrator using a short-memory
// Grunwald-Letnikov style update.
export class FractionalLorenz {
  constructor(params, x0, y0, z0) {
    this.setParams(params);
    this.reset(x0, y0, z0);
  }

  setParams(params) {
    this.alpha = params.alpha;
    this.dt = params.dt;
    this.memory = Math.max(1, Math.floor(params.memory));
    this.sigma = params.sigma;
    this.rho = params.rho;
    this.beta = params.beta;

    this.hAlpha = Math.pow(this.dt, this.alpha);
    this.coeffs = buildGlCoefficients(this.memory, this.alpha);
  }

  reset(x0, y0, z0) {
    this.xHist = [x0];
    this.yHist = [y0];
    this.zHist = [z0];
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

    for (let k = 1; k <= m; k += 1) {
      const coeff = this.coeffs[k];
      sumX += coeff * this.xHist[k - 1];
      sumY += coeff * this.yHist[k - 1];
      sumZ += coeff * this.zHist[k - 1];
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
    return {
      x: this.xHist[0],
      y: this.yHist[0],
      z: this.zHist[0],
    };
  }
}

export function createRandomFractionalLorenz(params, rng) {
  const x0 = randomBetween(rng, -6, 6);
  const y0 = randomBetween(rng, -6, 6);
  const z0 = randomBetween(rng, 8, 18);
  return new FractionalLorenz(params, x0, y0, z0);
}

export function rebuildLorenzKeepingState(current, params) {
  if (!current) {
    return new FractionalLorenz(params, 0, 1, 1);
  }

  const state = current.state;
  return new FractionalLorenz(params, state.x, state.y, state.z);
}

export function isLorenzStateDivergent(state) {
  if (!Number.isFinite(state.x) || !Number.isFinite(state.y) || !Number.isFinite(state.z)) {
    return true;
  }

  return Math.abs(state.x) > 1e6 || Math.abs(state.y) > 1e6 || Math.abs(state.z) > 1e6;
}

function buildGlCoefficients(memory, alpha) {
  const coeffs = new Array(memory + 1);
  coeffs[0] = 1;

  for (let k = 1; k <= memory; k += 1) {
    coeffs[k] = (1 - (1 + alpha) / k) * coeffs[k - 1];
  }

  return coeffs;
}
