// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

/**
 * Builds a fresh MCP server instance with all Backlog tools registered.
 * Used once for stdio; one instance per HTTP session for Streamable HTTP.
 */
export function createBacklogMcpServer(
  config: CreateBacklogMcpServerConfig
): BacklogMCPServer {
  const {
    version,
    useFields,
    backlog,
    clientRegistry,
    transHelper,
    enabledToolsets,
    mcpOption,
    dynamicToolsets,
  } = config;

  const server = wrapServerWithToolRegistry(
    new McpServer({
      name: 'backlog',
      title: useFields ? 'backlog (field selection enabled)' : 'backlog',
      version,
    })
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
