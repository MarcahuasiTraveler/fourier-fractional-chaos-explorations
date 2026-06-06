export function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return value;
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function deepMerge(base, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return patch;
  }

  const output = Array.isArray(base) ? [...base] : { ...base };

  for (const key of Object.keys(patch)) {
    const baseValue = output[key];
    const patchValue = patch[key];

    if (
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue) &&
      patchValue &&
      typeof patchValue === 'object' &&
      !Array.isArray(patchValue)
    ) {
      output[key] = deepMerge(baseValue, patchValue);
      continue;
    }

    output[key] = patchValue;
  }

  return output;
}
