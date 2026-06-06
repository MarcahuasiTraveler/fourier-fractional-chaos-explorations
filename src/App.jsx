import { button, Leva, useControls } from 'leva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG, createConfig } from './domain/config/defaultConfig.js';
import { createFourierCoefficients } from './domain/fourier.js';
import { SignalEngine } from './domain/signalEngine.js';
import { createSeededRng } from './domain/utils/rng.js';
import { deepMerge } from './domain/utils/object.js';
import { P5Canvas } from './render/P5Canvas.jsx';
import { createMainControlsSchema, createDerivedSchema } from './ui/controls/schema.js';
import { configToControlState, controlStateToConfig } from './ui/controls/controlMapping.js';
import { HarmonicsPanel } from './ui/HarmonicsPanel.jsx';
import { FloatingControlsModal } from './ui/FloatingControlsModal.jsx';
import { PRESETS, PRESET_OPTIONS } from './ui/presets.js';
import { buildShareUrl, parseConfigFromUrl, replaceUrlConfig } from './ui/urlState.js';

const RANDOM_SEED_MAX = 9999999;

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export default function App() {
  const configPanelId = 'Config\u200B';
  const initialConfig = useMemo(() => {
    const baseline = createConfig(DEFAULT_CONFIG);
    return createConfig(parseConfigFromUrl(baseline));
  }, []);

  const initialControlState = useMemo(
    () => configToControlState(initialConfig),
    [initialConfig],
  );

  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new SignalEngine(initialConfig);
  }

  const canvasApiRef = useRef(null);
  const [activePreset, setActivePreset] = useState('baseline');
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const levaTheme = useMemo(
    () => ({
      sizes: {
        rootWidth: '100%',
        controlWidth: '82%',
      },
    }),
    [],
  );

  const [controls, setControls] = useControls(
    configPanelId,
    () => createMainControlsSchema(initialControlState),
    [initialControlState],
  );

  const [, setDerived] = useControls('Derived', createDerivedSchema, []);

  const config = useMemo(
    () => createConfig(controlStateToConfig(controls, DEFAULT_CONFIG)),
    [controls],
  );

  const harmonics = useMemo(() => {
    if (!config.runtime.showHarmonicsPanel) return null;

    const rng = createSeededRng(config.seed);
    return createFourierCoefficients(config.fourier, rng).map(({ k, amp0, phi0 }) => ({
      k,
      amp0,
      phi0,
    }));
  }, [config.fourier, config.runtime.showHarmonicsPanel, config.seed]);

  useEffect(() => {
    engineRef.current.updateConfig(config);
  }, [config]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      replaceUrlConfig(config);
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [config]);

  const handleSnapshot = useCallback(
    (snapshot) => {
      if (snapshot.frame % 6 !== 0) return;

      setDerived({
        spectralEnergy: round(snapshot.spectral.total),
        spectralEnergyEma: round(snapshot.spectral.ema),
        spectralEnergyNorm: round(snapshot.spectral.normalized),
        chaosNorm: round(snapshot.chaos.norm || 0),
        frame: snapshot.frame,
      });
    },
    [setDerived],
  );

  const applyPreset = useCallback(() => {
    const preset = PRESETS[activePreset];
    if (!preset) return;
    const merged = createConfig(deepMerge(config, preset.patch));
    setControls(configToControlState(merged));
  }, [activePreset, config, setControls]);

  const incrementSeed = useCallback(() => {
    const currentSeed = Number(
      controls.seed ?? controls.seedV2 ?? controls.seedControl ?? config.seed,
    );
    setControls({ seed: currentSeed + 1 });
  }, [config.seed, controls.seed, controls.seedV2, controls.seedControl, setControls]);

  const decrementSeed = useCallback(() => {
    const currentSeed = Number(
      controls.seed ?? controls.seedV2 ?? controls.seedControl ?? config.seed,
    );
    setControls({ seed: Math.max(1, currentSeed - 1) });
  }, [config.seed, controls.seed, controls.seedV2, controls.seedControl, setControls]);

  const randomSeed = useCallback(() => {
    const value = 1 + Math.floor(Math.random() * RANDOM_SEED_MAX);
    setControls({ seed: value });
  }, [setControls]);

  const resetDynamics = useCallback(() => {
    engineRef.current.resetDynamics();
    canvasApiRef.current?.clearTrail();
  }, []);

  const resetConfig = useCallback(() => {
    const baseline = createConfig(DEFAULT_CONFIG);
    setControls(configToControlState(baseline));
    canvasApiRef.current?.clearTrail();
  }, [setControls]);

  const loadFromUrl = useCallback(() => {
    const baseline = createConfig(DEFAULT_CONFIG);
    const loaded = createConfig(parseConfigFromUrl(baseline));
    setControls(configToControlState(loaded));
    canvasApiRef.current?.clearTrail();
  }, [setControls]);

  const copyShareUrl = useCallback(async () => {
    const url = buildShareUrl(config);
    try {
      await navigator.clipboard.writeText(url);
    } catch (_error) {
      console.warn('Clipboard is unavailable in this browser context.');
    }
  }, [config]);

  const exportPng = useCallback(() => {
    canvasApiRef.current?.exportPng(`signal_lab_seed_${config.seed}`);
  }, [config.seed]);

  useControls(
    'Session',
    () => ({
      preset: {
        label: 'preset',
        value: activePreset,
        options: PRESET_OPTIONS,
        onChange: (value) => setActivePreset(value),
      },
      applyPreset: button(() => applyPreset()),
      prevSeed: button(() => decrementSeed()),
      nextSeed: button(() => incrementSeed()),
      randomSeed: button(() => randomSeed()),
      resetDynamics: button(() => resetDynamics()),
      resetConfig: button(() => resetConfig()),
      copyShareUrl: button(() => {
        void copyShareUrl();
      }),
      loadFromUrl: button(() => loadFromUrl()),
      exportPNG: button(() => exportPng()),
    }),
    [
      activePreset,
      applyPreset,
      decrementSeed,
      incrementSeed,
      randomSeed,
      resetDynamics,
      resetConfig,
      copyShareUrl,
      loadFromUrl,
      exportPng,
    ],
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Fourier + Chaos Lab</h1>
        <button
          type="button"
          className="controls-window-button"
          onClick={() => setIsControlsVisible((visible) => !visible)}
        >
          {isControlsVisible ? 'Hide Controls' : 'Show Controls'}
        </button>
      </header>

      <main className="workspace-layout">
        <section className="workspace">
          <P5Canvas engine={engineRef.current} onSnapshot={handleSnapshot} apiRef={canvasApiRef}>
            {config.runtime.showHarmonicsPanel ? (
              <HarmonicsPanel harmonics={harmonics} />
            ) : null}
          </P5Canvas>
        </section>
      </main>

      <FloatingControlsModal
        isOpen={isControlsVisible}
        onClose={() => setIsControlsVisible(false)}
        title="Signal Controls"
      >
        <div className="leva-shell leva-shell--modal">
          <Leva
            fill
            hideCopyButton
            neverHide
            oneLineLabels={false}
            theme={levaTheme}
            titleBar={false}
          />
        </div>
      </FloatingControlsModal>
    </div>
  );
}
