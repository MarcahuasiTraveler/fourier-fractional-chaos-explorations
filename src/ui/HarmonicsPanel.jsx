function formatNumber(value, digits = 4) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

export function HarmonicsPanel({ harmonics }) {
  if (!Array.isArray(harmonics) || harmonics.length === 0) {
    return null;
  }

  return (
    <section className="harmonics-panel" aria-label="Harmonic table">
      <header className="harmonics-panel__header">
        <span className="harmonics-panel__title">Harmonics</span>
        <span className="harmonics-panel__meta">terms={harmonics.length}</span>
      </header>

      <div className="harmonics-panel__body">
        <table className="harmonics-panel__table">
          <thead>
            <tr>
              <th scope="col">k</th>
              <th scope="col">amp0</th>
              <th scope="col">phi0</th>
            </tr>
          </thead>
          <tbody>
            {harmonics.map((harmonic, index) => (
              <tr key={`${harmonic.k}:${index}`}>
                <td>{harmonic.k}</td>
                <td>{formatNumber(harmonic.amp0)}</td>
                <td>{formatNumber(harmonic.phi0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
