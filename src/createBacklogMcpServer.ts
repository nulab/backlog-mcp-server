// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { McpServer } from '@modelcontextprotocol/server';
import type { Backlog } from 'backlog-js';
import type { TranslationHelper } from './createTranslationHelper.js';
import { registerDynamicTools, registerTools } from './registerTools.js';
import { organizationTools } from './tools/dynamicTools/organizations.js';
import { dynamicTools } from './tools/dynamicTools/toolsets.js';
import type { MCPOptions } from './types/mcp.js';
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
  transHelper: TranslationHelper;
  enabledToolsets: string[];
  mcpOption: MCPOptions;
  dynamicToolsets: boolean;
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
  transHelper,
  enabledToolsets,
  mcpOption,
  dynamicToolsets,
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

  const toolsetGroup = buildToolsetGroup(backlog, transHelper, enabledToolsets);
  registerTools(server, toolsetGroup, mcpOption);
  registerDynamicTools(
    server,
    organizationTools(clientRegistry, transHelper),
    mcpOption.prefix
  );

  if (dynamicToolsets) {
    const registrar = createToolRegistrar(server, toolsetGroup, mcpOption);
    const dynamicToolsetGroup = dynamicTools(
      registrar,
      transHelper,
      toolsetGroup
    );
    registerDynamicTools(server, dynamicToolsetGroup, mcpOption.prefix);
  }

  return server;
}
