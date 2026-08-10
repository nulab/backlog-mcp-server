import type { Backlog } from 'backlog-js';
import { createBacklogMcpServer } from './createBacklogMcpServer.js';
import { createDescriptionHelper } from './createDescriptionHelper.js';
import type { MCPOptions } from './types/mcp.js';
import type { BacklogClientRegistry } from './utils/backlogClientRegistry.js';
import { logger } from './utils/logger.js';

/**
 * Reports override keys in the config file that no tool or parameter asks for.
 *
 * The override keys are an untyped, unversioned public API: rename one in the
 * source and every user's override for it stops applying, falls back to the
 * built-in default, and says nothing. The user sees "I configured this and it
 * has no effect". This turns that into a line in the server log.
 *
 * The comparison is exact, which also catches keys written in the wrong case —
 * `t()` looks up `key.toUpperCase()`, so a lower-case entry in the config file
 * never matches anything either.
 */
export function reportUnknownOverrideKeys({
  overrides,
  version,
  backlog,
  clientRegistry,
  mcpOption,
}: {
  overrides: Record<string, string>;
  version: string;
  backlog: Backlog;
  clientRegistry: BacklogClientRegistry;
  mcpOption: MCPOptions;
}): void {
  const configured = Object.keys(overrides);
  if (configured.length === 0) return;

  // Keys are only recorded once a tool asks for them, so the set of valid keys
  // is whatever building the full tool list touches. This is a throwaway helper
  // and server built purely to collect them: the real ones may have toolsets
  // disabled, and their keys would then look unknown. ~17ms, and only for users
  // who actually have a config file.
  const probe = createDescriptionHelper();
  createBacklogMcpServer({
    version,
    useFields: mcpOption.useFields,
    backlog,
    clientRegistry,
    descriptionHelper: probe,
    enabledToolsets: ['all'],
    mcpOption: { ...mcpOption, useOrganization: true },
    dynamicToolsets: true,
  });

  const known = new Set(Object.keys(probe.dump()));
  const unknown = configured.filter((key) => !known.has(key));
  if (unknown.length === 0) return;

  // `error`, not `warn`: the logger drops anything below error in the default
  // configuration, which is what users run.
  logger.error(
    { keys: unknown },
    'These description override keys match no tool or parameter and had no effect'
  );
}
