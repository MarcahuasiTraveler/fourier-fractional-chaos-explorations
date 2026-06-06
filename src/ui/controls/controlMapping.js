import { deepClone } from '../../domain/utils/object.js';
import { clamp } from '../../domain/utils/math.js';
import { FOURIER_K_MAX } from '../../domain/fourier.js';
import { clampAlpha, hexToRgb, hexToRgba, rgbToHex, rgbaToHex } from './color.js';

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toInt(value, fallback = 0) {
  return Math.round(toNumber(value, fallback));
}

function toBool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

export function configToControlState(config) {
  return {
    seed: config.seed,

    canvasW: config.canvas.w,
    canvasH: config.canvas.h,

    renderFps: config.render.fps,
    renderPixelDensity: config.render.pixelDensity,
    renderBg: rgbToHex(config.render.bg),

    viewScale: config.view.scale,
    viewCenterX: config.view.center[0],
    viewCenterY: config.view.center[1],

    fourierK: config.fourier.K,
    fourierKMin: config.fourier.KMin,
    fourierKMax: config.fourier.KMax,
    fourierKStep: config.fourier.KStep,
    fourierBaseAmp: config.fourier.baseAmp,
    fourierDecay: config.fourier.decay,
    fourierAmpJitter: config.fourier.ampJitter,

    timeStep: config.time.step,
    timeSpeed: config.time.speed,

    trailMax: config.trail.max,
    trailStroke: rgbToHex(config.trail.stroke),
    trailWeight: config.trail.weight,
    trailOffscreen: config.trail.offscreen,

    epiShow: config.epicycles.show,
    epiCircleColor: rgbaToHex(config.epicycles.circleStroke),
    epiCircleAlpha: config.epicycles.circleStroke[3],
    epiLinkColor: rgbaToHex(config.epicycles.linkStroke),
    epiLinkAlpha: config.epicycles.linkStroke[3],
    epiTipColor: rgbToHex(config.epicycles.tip),
    epiTipSize: config.epicycles.tipSize,

    fracAlpha: config.chaos.frac.alpha,
    fracDt: config.chaos.frac.dt,
    fracMemory: config.chaos.frac.memory,
    fracSubsteps: config.chaos.frac.substeps,
    fracSigma: config.chaos.frac.sigma,
    fracRho: config.chaos.frac.rho,
    fracBeta: config.chaos.frac.beta,
    fracNormScale: config.chaos.frac.normScale,

    logisticR: config.chaos.logistic.r,
    logisticMix: config.chaos.logistic.mix,

    gainAmp: config.chaos.gain.amp,
    gainPhase: config.chaos.gain.phase,

    limitAlphaMin: config.limits.alphaMin,
    limitAlphaMax: config.limits.alphaMax,
    limitMemMin: config.limits.memMin,
    limitMemMax: config.limits.memMax,
    limitSpeedMin: config.limits.speedMin,
    limitSpeedMax: config.limits.speedMax,
    limitScaleMin: config.limits.scaleMin,
    limitScaleMax: config.limits.scaleMax,

    runtimePaused: config.runtime.paused,
    runtimeChaosOn: config.runtime.chaosOn,
    runtimeFracOn: config.runtime.fracOn,
    runtimeShowDebugOverlay: config.runtime.showDebugOverlay,
    runtimeShowHarmonicsPanel: config.runtime.showHarmonicsPanel,
  };
}

export function controlStateToConfig(controlValues, baseConfig) {
  const config = deepClone(baseConfig);

  config.seed = Math.max(
    1,
    toInt(
      controlValues.seed ?? controlValues.seedV2 ?? controlValues.seedControl,
      config.seed,
    ),
  );

  config.canvas.w = Math.max(1, toInt(controlValues.canvasW, config.canvas.w));
  config.canvas.h = Math.max(1, toInt(controlValues.canvasH, config.canvas.h));

  config.render.fps = Math.max(1, toInt(controlValues.renderFps, config.render.fps));
  config.render.pixelDensity = Math.max(
    1,
    toInt(controlValues.renderPixelDensity, config.render.pixelDensity),
  );
  config.render.bg = hexToRgb(controlValues.renderBg);

  config.limits.alphaMin = clamp(toNumber(controlValues.limitAlphaMin, config.limits.alphaMin), 0.0001, 0.999);
  config.limits.alphaMax = clamp(
    toNumber(controlValues.limitAlphaMax, config.limits.alphaMax),
    config.limits.alphaMin,
    0.999,
  );
  config.limits.memMin = Math.max(1, toInt(controlValues.limitMemMin, config.limits.memMin));
  config.limits.memMax = Math.max(config.limits.memMin, toInt(controlValues.limitMemMax, config.limits.memMax));
  config.limits.speedMin = Math.max(0.01, toNumber(controlValues.limitSpeedMin, config.limits.speedMin));
  config.limits.speedMax = Math.max(config.limits.speedMin, toNumber(controlValues.limitSpeedMax, config.limits.speedMax));
  config.limits.scaleMin = Math.max(0.0001, toNumber(controlValues.limitScaleMin, config.limits.scaleMin));
  config.limits.scaleMax = Math.max(config.limits.scaleMin, toNumber(controlValues.limitScaleMax, config.limits.scaleMax));

  config.view.scale = clamp(
    toNumber(controlValues.viewScale, config.view.scale),
    config.limits.scaleMin,
    config.limits.scaleMax,
  );
  config.view.center = [
    clamp(toNumber(controlValues.viewCenterX, config.view.center[0]), 0, 1),
    clamp(toNumber(controlValues.viewCenterY, config.view.center[1]), 0, 1),
  ];

  config.fourier.KMin = clamp(
    toInt(controlValues.fourierKMin, config.fourier.KMin),
    1,
    FOURIER_K_MAX,
  );
  config.fourier.KMax = clamp(
    toInt(controlValues.fourierKMax, config.fourier.KMax),
    config.fourier.KMin,
    FOURIER_K_MAX,
  );
  config.fourier.KStep = Math.max(1, toInt(controlValues.fourierKStep, config.fourier.KStep));
  config.fourier.K = clamp(
    toInt(controlValues.fourierK, config.fourier.K),
    config.fourier.KMin,
    Math.min(config.fourier.KMax, FOURIER_K_MAX),
  );
  config.fourier.baseAmp = Math.max(0, toNumber(controlValues.fourierBaseAmp, config.fourier.baseAmp));
  config.fourier.decay = Math.max(0, toNumber(controlValues.fourierDecay, config.fourier.decay));
  config.fourier.ampJitter = Math.max(0, toNumber(controlValues.fourierAmpJitter, config.fourier.ampJitter));

  config.time.step = toNumber(controlValues.timeStep, config.time.step);
  config.time.speed = toNumber(controlValues.timeSpeed, config.time.speed);

  config.trail.max = Math.max(10, toInt(controlValues.trailMax, config.trail.max));
  config.trail.stroke = hexToRgb(controlValues.trailStroke);
  config.trail.weight = Math.max(0.001, toNumber(controlValues.trailWeight, config.trail.weight));
  config.trail.offscreen = toBool(controlValues.trailOffscreen, config.trail.offscreen);

  config.epicycles.show = toBool(controlValues.epiShow, config.epicycles.show);
  config.epicycles.circleStroke = hexToRgba(
    controlValues.epiCircleColor,
    clampAlpha(controlValues.epiCircleAlpha),
  );
  config.epicycles.linkStroke = hexToRgba(
    controlValues.epiLinkColor,
    clampAlpha(controlValues.epiLinkAlpha),
  );
  config.epicycles.tip = hexToRgb(controlValues.epiTipColor);
  config.epicycles.tipSize = Math.max(0.1, toNumber(controlValues.epiTipSize, config.epicycles.tipSize));

  config.chaos.frac.alpha = clamp(
    toNumber(controlValues.fracAlpha, config.chaos.frac.alpha),
    config.limits.alphaMin,
    config.limits.alphaMax,
  );
  config.chaos.frac.dt = Math.max(0.00001, toNumber(controlValues.fracDt, config.chaos.frac.dt));
  config.chaos.frac.memory = clamp(
    toInt(controlValues.fracMemory, config.chaos.frac.memory),
    config.limits.memMin,
    config.limits.memMax,
  );
  config.chaos.frac.substeps = Math.max(1, toInt(controlValues.fracSubsteps, config.chaos.frac.substeps));
  config.chaos.frac.sigma = toNumber(controlValues.fracSigma, config.chaos.frac.sigma);
  config.chaos.frac.rho = toNumber(controlValues.fracRho, config.chaos.frac.rho);
  config.chaos.frac.beta = toNumber(controlValues.fracBeta, config.chaos.frac.beta);
  config.chaos.frac.normScale = Math.max(
    0.001,
    toNumber(controlValues.fracNormScale, config.chaos.frac.normScale),
  );

  config.chaos.logistic.r = toNumber(controlValues.logisticR, config.chaos.logistic.r);
  config.chaos.logistic.mix = toNumber(controlValues.logisticMix, config.chaos.logistic.mix);

  config.chaos.gain.amp = toNumber(controlValues.gainAmp, config.chaos.gain.amp);
  config.chaos.gain.phase = toNumber(controlValues.gainPhase, config.chaos.gain.phase);

  config.runtime.paused = toBool(controlValues.runtimePaused, config.runtime.paused);
  config.runtime.chaosOn = toBool(controlValues.runtimeChaosOn, config.runtime.chaosOn);
  config.runtime.fracOn = toBool(controlValues.runtimeFracOn, config.runtime.fracOn);
  config.runtime.showDebugOverlay = toBool(
    controlValues.runtimeShowDebugOverlay,
    config.runtime.showDebugOverlay,
  );
  config.runtime.showHarmonicsPanel = toBool(
    controlValues.runtimeShowHarmonicsPanel,
    config.runtime.showHarmonicsPanel,
  );

  return config;
}
