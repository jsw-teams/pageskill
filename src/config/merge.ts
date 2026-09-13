export function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => cloneValue(item)) as T;
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)])) as T;
  return value;
}

/**
 * Merge configuration data with deliberately small, YAML-like semantics:
 * objects recurse, arrays replace, and every scalar (including null) wins.
 */
export function mergeConfig<T extends Record<string, any>>(base: T, overlay: Record<string, any>): T {
  const result: Record<string, any> = cloneValue(base);
  for (const [key, value] of Object.entries(overlay)) {
    if (isRecord(result[key]) && isRecord(value)) result[key] = mergeConfig(result[key], value);
    else result[key] = cloneValue(value);
  }
  return result as T;
}

export function mergeConfigLayers(layers: Array<Record<string, any>>): Record<string, any> {
  return layers.reduce<Record<string, any>>((result, layer) => mergeConfig(result, layer), {});
}

export function cloneConfig<T>(value: T): T {
  return cloneValue(value);
}
