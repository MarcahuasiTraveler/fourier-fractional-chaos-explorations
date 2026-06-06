import { computeHarmonicModulation } from './chaos.js';
import {
  createRandomFractionalLorenz,
  isLorenzStateDivergent,
  rebuildLorenzKeepingState,
} from './fractionalLorenz.js';
import { createFourierCoefficients } from './fourier.js';
import { createInitialLogisticStates, stepLogisticStates } from './logistic.js';
import { deepClone, deepFreeze, sameJson } from './utils/object.js';
import { clamp, lerp, tanh, wrapAngle } from './utils/math.js';
import { createSeededRng } from './utils/rng.js';

const CHAOS_NORM_SMOOTHING = 0.02;
const ENERGY_SMOOTHING = 0.08;

function fracDynamicsSignature(fracConfig) {
  return {
    alpha: fracConfig.alpha,
    dt: fracConfig.dt,
    memory: fracConfig.memory,
    substeps: fracConfig.substeps,
    sigma: fracConfig.sigma,
    rho: fracConfig.rho,
    beta: fracConfig.beta,
  };
}

// SignalEngine is the only mutable runtime unit.
// Config remains immutable, while dynamics (phase, chaos states, EMA stats)
// evolve deterministically from that config.
export class SignalEngine {
  constructor(initialConfig) {
    this.config = null;
    this.rng = null;
    this.coefficients = [];
    this.logisticStates = [];
    this.lorenz = null;

    this.t = 0;
    this.frame = 0;
    this.normEma = 1;
    this.spectralEnergyEma = 0;
    this.spectralEnergyPeak = 1e-6;

    this.updateConfig(initialConfig);
  }

  getConfig() {
    return this.config;
  }

  updateConfig(nextConfig) {
    const frozen = deepFreeze(deepClone(nextConfig));
    const previous = this.config;

    this.config = frozen;

    if (!previous) {
      this.reseed(frozen.seed);
      return;
    }

    const needsReseed =
      previous.seed !== frozen.seed ||
      !sameJson(previous.fourier, frozen.fourier);

    if (needsReseed) {
      this.reseed(frozen.seed);
      return;
    }

    const needsLorenzRebuild = !sameJson(
      fracDynamicsSignature(previous.chaos.frac),
      fracDynamicsSignature(frozen.chaos.frac),
    );
    if (needsLorenzRebuild) {
      this.lorenz = rebuildLorenzKeepingState(this.lorenz, frozen.chaos.frac);
    }

    this.normEma = frozen.chaos.frac.normScale;

    // Keep logistic buffer aligned when K changes indirectly.
    if (this.logisticStates.length !== this.coefficients.length) {
      this.logisticStates = createInitialLogisticStates(
        this.coefficients.length,
        this.rng || createSeededRng(frozen.seed),
      );
    }
  }

  reseed(seed) {
    const numericSeed = Number.isFinite(Number(seed)) ? Math.floor(Number(seed)) : 1;
    const safeSeed = numericSeed === 0 ? 1 : numericSeed;

    this.rng = createSeededRng(safeSeed);
    this.coefficients = createFourierCoefficients(this.config.fourier, this.rng);
    this.logisticStates = createInitialLogisticStates(this.coefficients.length, this.rng);
    this.lorenz = createRandomFractionalLorenz(this.config.chaos.frac, this.rng);

    this.t = 0;
    this.frame = 0;
    this.normEma = this.config.chaos.frac.normScale;
    this.spectralEnergyEma = 0;
    this.spectralEnergyPeak = 1e-6;
  }

  resetDynamics() {
    this.t = 0;
    this.frame = 0;
    this.normEma = this.config.chaos.frac.normScale;
    this.spectralEnergyEma = 0;
    this.spectralEnergyPeak = 1e-6;

    if (this.rng) {
      this.lorenz = createRandomFractionalLorenz(this.config.chaos.frac, this.rng);
      this.logisticStates = createInitialLogisticStates(this.coefficients.length, this.rng);
    }
  }

  stepFrame() {
    const cfg = this.config;
    const paused = cfg.runtime.paused;

    if (!paused) {
      this.stepChaosSystems(cfg.runtime.chaosOn, cfg.runtime.fracOn);
    }

    const chaosSignals = this.getChaosSignals(cfg.runtime.chaosOn, cfg.runtime.fracOn);
    const signalSnapshot = this.evaluateSignal(chaosSignals);

    if (!paused) {
      this.t = wrapAngle(this.t + cfg.time.step * cfg.time.speed);
      this.frame += 1;
    }

    return {
      config: cfg,
      frame: this.frame,
      t: this.t,
      advanced: !paused,
      point: signalSnapshot.point,
      chain: signalSnapshot.chain,
      chaos: chaosSignals,
      spectral: signalSnapshot.spectral,
    };
  }

  stepChaosSystems(chaosOn, fracOn) {
    if (!chaosOn) return;

    if (fracOn) {
      const substeps = Math.max(1, Math.floor(this.config.chaos.frac.substeps));
      for (let i = 0; i < substeps; i += 1) {
        this.lorenz.step();
      }

      if (isLorenzStateDivergent(this.lorenz.state)) {
        this.lorenz = createRandomFractionalLorenz(this.config.chaos.frac, this.rng);
      }
    }

    stepLogisticStates(this.logisticStates, this.config.chaos.logistic.r);
  }

  getChaosSignals(chaosOn, fracOn) {
    if (!chaosOn || !fracOn) {
      return { nx: 0, ny: 0, nz: 0, norm: 0, raw: null };
    }

    const state = this.lorenz.state;
    const base = this.config.chaos.frac.normScale;
    const absMax = Math.max(Math.abs(state.x), Math.abs(state.y), Math.abs(state.z));
    const target = Math.max(base, absMax / 1.35);

    this.normEma = lerp(this.normEma, target, CHAOS_NORM_SMOOTHING);
    const normalizer = Math.max(1e-6, this.normEma);

    return {
      nx: tanh(state.x / normalizer),
      ny: tanh(state.y / normalizer),
      nz: tanh(state.z / normalizer),
      norm: normalizer,
      raw: state,
    };
  }

  evaluateSignal(chaosSignals) {
    const cfg = this.config;

    let vx = 0;
    let vy = 0;
    let energy = 0;
    const chain = new Array(this.coefficients.length);

    for (let i = 0; i < this.coefficients.length; i += 1) {
      const harmonic = this.coefficients[i];
      const logisticState = this.logisticStates[i] ?? 0.5;
      const modulation = cfg.runtime.chaosOn
        ? computeHarmonicModulation(
            harmonic,
            i,
            chaosSignals,
            logisticState,
            cfg.chaos.logistic.mix,
          )
        : { ampMul: 1, phase: 0 };

      const amp = harmonic.amp0 * (1 + cfg.chaos.gain.amp * (modulation.ampMul - 1));
      const phi = harmonic.phi0 + cfg.chaos.gain.phase * modulation.phase;
      const ang = harmonic.k * this.t + phi;

      const nx = vx + amp * Math.cos(ang);
      const ny = vy + amp * Math.sin(ang);

      chain[i] = {
        x0: vx,
        y0: vy,
        x1: nx,
        y1: ny,
        amp,
      };

      vx = nx;
      vy = ny;
      energy += amp * amp;
    }

    this.spectralEnergyEma = lerp(this.spectralEnergyEma, energy, ENERGY_SMOOTHING);
    this.spectralEnergyPeak = Math.max(
      this.spectralEnergyPeak * 0.999,
      this.spectralEnergyEma,
      1e-6,
    );

    const normalizedEnergy = clamp(
      this.spectralEnergyEma / this.spectralEnergyPeak,
      0,
      1,
    );

    return {
      point: { x: vx, y: vy },
      chain,
      spectral: {
        total: energy,
        ema: this.spectralEnergyEma,
        peak: this.spectralEnergyPeak,
        normalized: normalizedEnergy,
      },
    };
  }
}
