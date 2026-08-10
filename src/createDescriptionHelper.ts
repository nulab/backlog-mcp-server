/**
 * Resolves the strings every tool definition passes through `t()`. Almost all of
 * them are tool and parameter descriptions, read by the model when it picks a
 * tool and fills in arguments. A few are validation error messages — `deleteVersion`
 * and `resolveIdOrField` throw them — which do surface, as the text of a failed
 * tool result.
 *
 * This module intentionally imports nothing. Every tool in `src/tools/` depends on
 * it, so anything imported here is reachable from the tool layer — and the tool
 * layer is meant to run on non-Node runtimes too. Discovering and reading the
 * override file needs a filesystem and a home directory, so that part lives in
 * `loadDescriptionOverrides` and the CLI passes the result in.
 */
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

    // Priority：ENV → overrides → fallback
    const value = fromEnv || overrides[upperKey] || fallback;

    usedKeys[upperKey] = value;
    return value;
  }

  function dump(): Record<string, string> {
    return { ...usedKeys };
  }

  return { t, dump };
}
