// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

/**
 * Loose view of the Worker env for reading string `vars`. Kept free of
 * `@cloudflare/workers-types` so this module (and its unit test) type-check in
 * the Node program without pulling in Workers global declarations. The fully
 * typed `WorkerEnv` (with the `MCP_DO` binding) lives in `./env.ts`.
 */
export type WorkerVars = Record<string, unknown>;

export type ResolvedWorkerConfig = {
  mcpPath: string;
  useFields: boolean;
  maxTokens: number;
  prefix: string;
  enabledToolsets: string[];
  dynamicToolsets: boolean;
  enableJsonResponse: boolean;
  allowedHosts?: string[];
};

/**
 * Reads a string var from the Worker env, ignoring non-string bindings.
 */
function str(env: WorkerVars, key: string): string | undefined {
  const value = env[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Parses a boolean var, treating the literal string 'true' (case-insensitive)
 * as true and everything else (including unset) as the given default.
 */
function bool(env: WorkerVars, key: string, fallback: boolean): boolean {
  const value = str(env, key);
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

/**
 * Parses a positive integer var, falling back when unset or invalid.
 */
function positiveInt(env: WorkerVars, key: string, fallback: number): number {
  const value = str(env, key);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Resolves runtime configuration from Worker env vars, mirroring the defaults
 * of the stdio CLI (`src/index.ts`) so the two transports behave identically.
 */
export function resolveWorkerConfig(env: WorkerVars): ResolvedWorkerConfig {
  const dynamicToolsets = bool(env, 'ENABLE_DYNAMIC_TOOLSETS', false);

  const rawToolsets = (str(env, 'ENABLE_TOOLSETS') ?? 'all')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const enabledToolsets = dynamicToolsets
    ? rawToolsets.filter((t) => t !== 'all')
    : rawToolsets;

  const allowedHostsRaw = str(env, 'MCP_HTTP_ALLOWED_HOSTS') ?? '';
  const allowedHosts =
    allowedHostsRaw.trim().length > 0
      ? allowedHostsRaw
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean)
      : undefined;

  const rawPath = str(env, 'MCP_HTTP_PATH') ?? '/mcp';
  const mcpPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  return {
    mcpPath,
    useFields: bool(env, 'OPTIMIZE_RESPONSE', false),
    maxTokens: positiveInt(env, 'MAX_TOKENS', 50000),
    prefix: str(env, 'PREFIX') ?? '',
    enabledToolsets,
    dynamicToolsets,
    enableJsonResponse: bool(env, 'MCP_HTTP_JSON_RESPONSE', false),
    allowedHosts,
  };
}
