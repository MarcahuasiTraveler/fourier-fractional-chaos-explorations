function clampByte(value, fallback = 0) {
  const n = Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHexByte(value) {
  return clampByte(value).toString(16).padStart(2, '0');
}

export function rgbToHex(rgb) {
  return `#${toHexByte(rgb[0])}${toHexByte(rgb[1])}${toHexByte(rgb[2])}`;
}

export function rgbaToHex(rgba) {
  return rgbToHex(rgba);
}

export function hexToRgb(hex) {
  const normalized = (hex || '#000000').replace('#', '').trim();
  const padded = normalized.length === 3
    ? normalized
        .split('')
        .map((ch) => `${ch}${ch}`)
        .join('')
    : normalized.padEnd(6, '0').slice(0, 6);

  const r = parseInt(padded.slice(0, 2), 16);
  const g = parseInt(padded.slice(2, 4), 16);
  const b = parseInt(padded.slice(4, 6), 16);

  return [
    Number.isFinite(r) ? r : 0,
    Number.isFinite(g) ? g : 0,
    Number.isFinite(b) ? b : 0,
  ];
}

export function hexToRgba(hex, alpha = 255) {
  const [r, g, b] = hexToRgb(hex);
  return [r, g, b, clampByte(alpha, 255)];
}

export function clampAlpha(alpha, fallback = 255) {
  return clampByte(alpha, fallback);
}
