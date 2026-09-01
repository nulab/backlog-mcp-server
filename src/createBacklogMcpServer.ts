// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { McpServer } from '@modelcontextprotocol/server';
import type { Backlog } from 'backlog-js';
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
  backlog: Backlog;
  clientRegistry: BacklogClientRegistry;
  descriptionHelper: DescriptionHelper;
  enabledToolsets: string[];
  mcpOption: MCPOptions;
  /**
   * A toolset group to register from, instead of building one from
   * `enabledToolsets`. Callers that produce many servers from one factory pass a
   * single shared group so the tool tree is built once rather than per request.
   * Nothing mutates it.
   */
  toolsetGroup?: ToolsetGroup;
};

// The tool list is fixed for the process lifetime: it only depends on CLI flags
// and environment, so clients may cache it.
const TOOL_LIST_CACHE_HINT = {
  'tools/list': { ttlMs: 5 * 60 * 1000, cacheScope: 'public' },
} as const;

/**
 * Builds a fresh MCP server instance with all Backlog tools registered.
 * Used once per stdio connection; one instance per HTTP request for Streamable HTTP.
 */
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
      { cacheHints: TOOL_LIST_CACHE_HINT }
    )
  );

  const toolsetGroup =
    sharedToolsetGroup ??
    buildToolsetGroup(backlog, descriptionHelper, enabledToolsets);
  registerTools(server, toolsetGroup, mcpOption);

  // `list_organizations` only has something to report when more than one space
  // is configured; the `organization` parameter its description points at is
  // published under the same condition.
  if (mcpOption.useOrganization) {
    registerTools(
      server,
      organizationTools(clientRegistry, descriptionHelper),
      // `useOrganization: false` regardless of the flag that got us here.
      // `list_organizations` is what a caller reads to learn what may go in
      // `organization`; scoping the answer to one organization is circular.
      { ...mcpOption, useOrganization: false }
    );
  }

  return server;
}
