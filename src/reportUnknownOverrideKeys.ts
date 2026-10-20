import type { Client } from 'backlog-js';
import { createBacklogMcpServer } from './createBacklogMcpServer.js';
import { createDescriptionHelper } from './createDescriptionHelper.js';
import type { MCPOptions } from './types/mcp.js';
import type { BacklogClientRegistry } from './utils/backlogClientRegistry.js';
import { logger } from './utils/logger.js';

// Override keys are an untyped public API: a renamed key silently stops applying.
// Exact comparison also catches lower-case keys, which `t()` never matches.
export function reportUnknownOverrideKeys({
  overrides,
  version,
  backlog,
  clientRegistry,
  mcpOption,
}: {
  overrides: Record<string, string>;
  version: string;
  backlog: Client;
  clientRegistry: BacklogClientRegistry;
  mcpOption: MCPOptions;
}): void {
  const configured = Object.keys(overrides);
  if (configured.length === 0) return;

  // Keys are recorded only when a tool asks for them, so build every toolset on a throwaway
  // server; the real one may have toolsets disabled whose keys would look unknown.
  const probe = createDescriptionHelper();
  createBacklogMcpServer({
    version,
    useFields: mcpOption.useFields,
    backlog,
    clientRegistry,
    descriptionHelper: probe,
    enabledToolsets: ['all'],
    mcpOption: { ...mcpOption, useOrganization: true },
  });

  const known = new Set(Object.keys(probe.dump()));
  const unknown = configured.filter((key) => !known.has(key));
  if (unknown.length === 0) return;

  // `error`, not `warn`: the default logger configuration drops anything below error.
  logger.error(
    { keys: unknown },
    'These description override keys match no tool or parameter and had no effect'
  );
}
