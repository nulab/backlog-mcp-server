// Imports nothing on purpose: every tool depends on this module and the tool layer must run
// on non-Node runtimes, so reading the override file lives in `loadDescriptionOverrides`.
export interface DescriptionHelper {
  t: (key: string, fallback: string) => string;
  dump: () => Record<string, string>;
}

export function createDescriptionHelper(
  overrides: Record<string, string> = {}
): DescriptionHelper {
  const usedKeys: Record<string, string> = {};

  function toEnvKey(key: string): string {
    return `BACKLOG_MCP_${key}`;
  }

  function t(key: string, fallback: string): string {
    const upperKey = key.toUpperCase();

    if (usedKeys[upperKey]) {
      return usedKeys[upperKey];
    }

    // Runtimes without a Node compatibility layer have no `process`, and a
    // partial shim can have `process` without `env`.
    const env = typeof process === 'undefined' ? undefined : process.env;
    const fromEnv = env?.[toEnvKey(upperKey)];

    const value = fromEnv || overrides[upperKey] || fallback;

    usedKeys[upperKey] = value;
    return value;
  }

  function dump(): Record<string, string> {
    return { ...usedKeys };
  }

  return { t, dump };
}
