// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { McpServer } from '@modelcontextprotocol/server';
import type { Backlog } from 'backlog-js';
import type { DescriptionHelper } from './createDescriptionHelper.js';
import { registerDynamicTools, registerTools } from './registerTools.js';
import { organizationTools } from './tools/dynamicTools/organizations.js';
import { dynamicTools } from './tools/dynamicTools/toolsets.js';
import type { MCPOptions } from './types/mcp.js';
import type { ToolsetGroup } from './types/toolsets.js';
import type { BacklogClientRegistry } from './utils/backlogClientRegistry.js';
import { createToolRegistrar } from './utils/toolRegistrar.js';
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
  dynamicToolsets: boolean;
  /**
   * A toolset group to register from, instead of building one from
   * `enabledToolsets`. Callers that produce many servers from one factory pass
   * a single shared group: `enable_toolset` mutates it, and under the stateless
   * HTTP model — one server per request — a group built per server would throw
   * that mutation away the moment the request ends.
   */
  toolsetGroup?: ToolsetGroup;
};

// The tool list is fixed for the process lifetime (it only depends on CLI flags
// and environment), so clients may cache it. With dynamic toolsets the list can
// grow at runtime, so no hint is published in that case.
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
  dynamicToolsets,
  toolsetGroup: sharedToolsetGroup,
}: CreateBacklogMcpServerConfig): BacklogMCPServer {
  const server = wrapServerWithToolRegistry(
    new McpServer(
      {
        name: 'backlog',
        title: useFields ? 'backlog (field selection enabled)' : 'backlog',
        version,
      },
      dynamicToolsets ? undefined : { cacheHints: TOOL_LIST_CACHE_HINT }
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
    registerDynamicTools(
      server,
      organizationTools(clientRegistry, descriptionHelper),
      mcpOption.prefix
    );
  }

  if (dynamicToolsets) {
    const registrar = createToolRegistrar(server, toolsetGroup, mcpOption);
    const dynamicToolsetGroup = dynamicTools(
      registrar,
      descriptionHelper,
      toolsetGroup
    );
    registerDynamicTools(server, dynamicToolsetGroup, mcpOption.prefix);
  }

  return server;
}
