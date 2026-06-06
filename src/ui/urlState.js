import { deepMerge } from '../domain/utils/object.js';

const QUERY_KEY = 'cfg';

function encodeUnicode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeUnicode(value) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(config) {
  const params = new URLSearchParams(window.location.search);
  params.set(QUERY_KEY, encodeUnicode(JSON.stringify(config)));
  const url = new URL(window.location.href);
  url.search = params.toString();
  return url.toString();
}

export function replaceUrlConfig(config) {
  const url = buildShareUrl(config);
  window.history.replaceState({}, '', url);
}

export function parseConfigFromUrl(baseConfig) {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(QUERY_KEY);
  if (!raw) return baseConfig;

  try {
    const parsed = JSON.parse(decodeUnicode(raw));
    return deepMerge(baseConfig, parsed);
  } catch (error) {
    // Invalid URL config should not block the app.
    console.warn('Skipping invalid URL config payload:', error);
    return baseConfig;
  }
}
