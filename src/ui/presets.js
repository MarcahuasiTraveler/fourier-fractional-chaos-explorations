export const PRESETS = {
  baseline: {
    label: 'Baseline',
    patch: {},
  },
  phaseTwist: {
    label: 'Phase Twist',
    patch: {
      fourier: { K: 10, decay: 0.92 },
      chaos: {
        gain: { amp: 0.25, phase: 1.0 },
        logistic: { mix: 1.0, r: 3.84 },
      },
      runtime: { fracOn: true },
    },
  },
  amplitudeBloom: {
    label: 'Amplitude Bloom',
    patch: {
      fourier: { K: 10, baseAmp: 80, decay: 0.75 },
      chaos: {
        frac: { alpha: 0.2, memory: 256, substeps: 48 },
        gain: { amp: 1.8, phase: 0.15 },
        logistic: { mix: 0.7, r: 3.74 },
      },
      runtime: { fracOn: true },
    },
  },
  nearPeriodic: {
    label: 'Near Periodic',
    patch: {
      chaos: {
        logistic: { r: 3.57, mix: 0.2 },
        gain: { amp: 0.2, phase: 0.05 },
      },
      runtime: { fracOn: false },
    },
  },
};

export const PRESET_OPTIONS = Object.fromEntries(
  Object.entries(PRESETS).map(([key, value]) => [value.label, key]),
);
