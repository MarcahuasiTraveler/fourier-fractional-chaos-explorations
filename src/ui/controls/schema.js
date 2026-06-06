import { folder } from 'leva';
import { FOURIER_K_MAX } from '../../domain/fourier.js';

export function createMainControlsSchema(initial) {
  const canvasFolder = folder(
    {
      canvasW: { value: initial.canvasW, min: 128, max: 8192, step: 1, label: 'width' },
      canvasH: { value: initial.canvasH, min: 128, max: 8192, step: 1, label: 'height' },
    },
    { collapsed: true },
  );

  const renderFolder = folder(
    {
      renderFps: { value: initial.renderFps, min: 1, max: 120, step: 1, label: 'fps' },
      renderPixelDensity: {
        value: initial.renderPixelDensity,
        min: 1,
        max: 4,
        step: 1,
        label: 'pixelDensity',
      },
      renderBg: { value: initial.renderBg, label: 'background' },
    },
    { collapsed: true },
  );

  const viewFolder = folder(
    {
      viewScale: { value: initial.viewScale, min: 0.002, max: 10, step: 0.001, label: 'scale' },
      viewCenterX: { value: initial.viewCenterX, min: 0, max: 1, step: 0.001, label: 'center x' },
      viewCenterY: { value: initial.viewCenterY, min: 0, max: 1, step: 0.001, label: 'center y' },
    },
    { collapsed: true },
  );

  const fourierFolder = folder(
    {
      fourierK: { value: initial.fourierK, min: 1, max: FOURIER_K_MAX, step: 1, label: 'K' },
      fourierKMin: { value: initial.fourierKMin, min: 1, max: 2000, step: 1, label: 'K min' },
      fourierKMax: { value: initial.fourierKMax, min: 1, max: FOURIER_K_MAX, step: 1, label: 'K max' },
      fourierKStep: { value: initial.fourierKStep, min: 1, max: 100, step: 1, label: 'K step' },
      fourierBaseAmp: { value: initial.fourierBaseAmp, min: 0, max: 300, step: 0.1, label: 'baseAmp' },
      fourierDecay: { value: initial.fourierDecay, min: 0, max: 4, step: 0.001, label: 'decay' },
      fourierAmpJitter: {
        value: initial.fourierAmpJitter,
        min: 0,
        max: 4,
        step: 0.001,
        label: 'ampJitter',
      },
    },
    { collapsed: false },
  );

  const timeFolder = folder(
    {
      timeStep: { value: initial.timeStep, min: 0.0001, max: 32, step: 0.0001, label: 'step' },
      timeSpeed: { value: initial.timeSpeed, min: 0.1, max: 100000, step: 0.1, label: 'speed' },
    },
    { collapsed: true },
  );

  const trailFolder = folder(
    {
      trailMax: { value: initial.trailMax, min: 10, max: 30000, step: 1, label: 'max points' },
      trailStroke: { value: initial.trailStroke, label: 'color' },
      trailWeight: { value: initial.trailWeight, min: 0.001, max: 10, step: 0.001, label: 'weight' },
      trailOffscreen: { value: initial.trailOffscreen, label: 'offscreen layer' },
    },
    { collapsed: true },
  );

  const epicyclesFolder = folder(
    {
      epiShow: { value: initial.epiShow, label: 'show' },
      epiCircleColor: { value: initial.epiCircleColor, label: 'circle color' },
      epiCircleAlpha: { value: initial.epiCircleAlpha, min: 0, max: 255, step: 1, label: 'circle alpha' },
      epiLinkColor: { value: initial.epiLinkColor, label: 'link color' },
      epiLinkAlpha: { value: initial.epiLinkAlpha, min: 0, max: 255, step: 1, label: 'link alpha' },
      epiTipColor: { value: initial.epiTipColor, label: 'tip color' },
      epiTipSize: { value: initial.epiTipSize, min: 0.1, max: 50, step: 0.1, label: 'tip size' },
    },
    { collapsed: true },
  );

  const chaosFracFolder = folder(
    {
      fracAlpha: { value: initial.fracAlpha, min: 0.001, max: 0.999, step: 0.001, label: 'alpha' },
      fracDt: { value: initial.fracDt, min: 0.00001, max: 0.5, step: 0.00001, label: 'dt' },
      fracMemory: { value: initial.fracMemory, min: 1, max: 1000, step: 1, label: 'memory' },
      fracSubsteps: { value: initial.fracSubsteps, min: 1, max: 128, step: 1, label: 'substeps' },
      fracSigma: { value: initial.fracSigma, min: -64, max: 64, step: 0.001, label: 'sigma' },
      fracRho: { value: initial.fracRho, min: -64, max: 64, step: 0.001, label: 'rho' },
      fracBeta: { value: initial.fracBeta, min: -64, max: 64, step: 0.001, label: 'beta' },
      fracNormScale: {
        value: initial.fracNormScale,
        min: 0.001,
        max: 1000,
        step: 0.001,
        label: 'normScale',
      },
    },
    { collapsed: false },
  );

  const chaosLogisticFolder = folder(
    {
      logisticR: { value: initial.logisticR, min: 0, max: 4, step: 0.0001, label: 'r' },
      logisticMix: { value: initial.logisticMix, min: 0, max: 4, step: 0.0001, label: 'mix' },
    },
    { collapsed: true },
  );

  const chaosGainFolder = folder(
    {
      gainAmp: { value: initial.gainAmp, min: 0, max: 100, step: 0.0001, label: 'amp gain' },
      gainPhase: { value: initial.gainPhase, min: -4, max: 4, step: 0.0001, label: 'phase gain' },
    },
    { collapsed: true },
  );

  const runtimeFolder = folder(
    {
      runtimePaused: { value: initial.runtimePaused, label: 'paused' },
      runtimeChaosOn: { value: initial.runtimeChaosOn, label: 'chaos on' },
      runtimeFracOn: { value: initial.runtimeFracOn, label: 'fractional on' },
      runtimeShowDebugOverlay: {
        value: initial.runtimeShowDebugOverlay,
        label: 'debug overlay',
      },
      runtimeShowHarmonicsPanel: {
        value: initial.runtimeShowHarmonicsPanel,
        label: 'harmonics panel',
      },
    },
    { collapsed: false },
  );

  const limitsFolder = folder(
    {
      limitAlphaMin: { value: initial.limitAlphaMin, min: 0.0001, max: 0.999, step: 0.0001, label: 'alpha min' },
      limitAlphaMax: { value: initial.limitAlphaMax, min: 0.0001, max: 0.999, step: 0.0001, label: 'alpha max' },
      limitMemMin: { value: initial.limitMemMin, min: 1, max: 5000, step: 1, label: 'memory min' },
      limitMemMax: { value: initial.limitMemMax, min: 1, max: 5000, step: 1, label: 'memory max' },
      limitSpeedMin: { value: initial.limitSpeedMin, min: 0.001, max: 100000, step: 0.001, label: 'speed min' },
      limitSpeedMax: { value: initial.limitSpeedMax, min: 0.001, max: 100000, step: 0.001, label: 'speed max' },
      limitScaleMin: { value: initial.limitScaleMin, min: 0.0001, max: 100, step: 0.0001, label: 'scale min' },
      limitScaleMax: { value: initial.limitScaleMax, min: 0.0001, max: 100, step: 0.0001, label: 'scale max' },
    },
    { collapsed: true },
  );

  const seedValue = Number.isFinite(Number(initial.seed))
    ? Number(initial.seed)
    : Number.isFinite(Number(initial.seedV2))
      ? Number(initial.seedV2)
      : 666;

  return {
    seed: { value: seedValue, step: 1 },

    Environment: folder(
      {
        Canvas: canvasFolder,
        Render: renderFolder,
        View: viewFolder,
      },
      { collapsed: false },
    ),

    Signal: folder(
      {
        Fourier: fourierFolder,
        Time: timeFolder,
        Trail: trailFolder,
        Epicycles: epicyclesFolder,
      },
      { collapsed: false },
    ),

    Chaos: folder(
      {
        ChaosFrac: chaosFracFolder,
        ChaosLogistic: chaosLogisticFolder,
        ChaosGain: chaosGainFolder,
      },
      { collapsed: false },
    ),

    RuntimeAndLimits: folder(
      {
        Runtime: runtimeFolder,
        Limits: limitsFolder,
      },
      { collapsed: false },
    ),
  };
}

export function createDerivedSchema() {
  return {
    spectralEnergy: { value: 0, editable: false, label: 'E(t)' },
    spectralEnergyEma: { value: 0, editable: false, label: 'E ema' },
    spectralEnergyNorm: { value: 0, editable: false, label: 'E norm' },
    chaosNorm: { value: 0, editable: false, label: 'chaos norm' },
    frame: { value: 0, editable: false, label: 'frame' },
  };
}
