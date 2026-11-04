import { McpServer } from '@modelcontextprotocol/server';
import type { Client } from 'backlog-js';
import type { DescriptionHelper } from './createDescriptionHelper.js';
import { registerTools } from './registerTools.js';
import { organizationTools } from './tools/organizations.js';
import type { MCPOptions } from './types/mcp.js';
import type { ToolsetGroup } from './types/toolsets.js';
import type { BacklogClientRegistry } from './utils/backlogClientRegistry.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import {
  type BacklogMCPServer,
  wrapServerWithToolRegistry,
} from './utils/wrapServerWithToolRegistry.js';

export type CreateBacklogMcpServerConfig = {
  version: string;
  useFields: boolean;
  backlog: Client;
  clientRegistry: BacklogClientRegistry;
  descriptionHelper: DescriptionHelper;
  enabledToolsets: string[];
  mcpOption: MCPOptions;
  /** Shared by servers from one factory so the tool tree is built once, not per request. Never mutated. */
  toolsetGroup?: ToolsetGroup;
};

// The tool list is fixed for the process lifetime: it only depends on CLI flags
// and environment, so clients may cache it.
const TOOL_LIST_CACHE_HINT = {
  'tools/list': { ttlMs: 5 * 60 * 1000, cacheScope: 'public' },
} as const;

// CVE-2026-111768 — the SDK applies no limit by default, so one tools/call with
// a huge array or object exhausts memory during validation. The largest real
// inputs are ID lists, which Backlog's own query-string limits keep far below this.
export const MAX_TOOL_INPUT_ELEMENTS = 1000;

export function createBacklogMcpServer({
  version,
  useFields,
  backlog,
  clientRegistry,
  descriptionHelper,
  enabledToolsets,
  mcpOption,
  toolsetGroup: sharedToolsetGroup,
}: CreateBacklogMcpServerConfig): BacklogMCPServer {
  const server = wrapServerWithToolRegistry(
    new McpServer(
      {
        name: 'backlog',
        title: useFields ? 'backlog (field selection enabled)' : 'backlog',
        version,
      },
      {
        cacheHints: TOOL_LIST_CACHE_HINT,
        maxToolInputElements: MAX_TOOL_INPUT_ELEMENTS,
      }
    )
  );

  const toolsetGroup =
    sharedToolsetGroup ??
    buildToolsetGroup(backlog, descriptionHelper, enabledToolsets);
  registerTools(server, toolsetGroup, mcpOption);

  // `list_organizations` only matters with more than one space, the same condition
  // under which the `organization` parameter is published.
  if (mcpOption.useOrganization) {
    registerTools(
      server,
      organizationTools(clientRegistry, descriptionHelper),
      // `list_organizations` tells callers what may go in `organization`; scoping it to one
      // organization would be circular.
      { ...mcpOption, useOrganization: false }
    );
  }

  return server;
}
