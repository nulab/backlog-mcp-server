// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Backlog } from 'backlog-js';
import type { TranslationHelper } from './createTranslationHelper.js';
import { registerDynamicTools, registerTools } from './registerTools.js';
import { dynamicTools } from './tools/dynamicTools/toolsets.js';
import { createToolRegistrar } from './utils/toolRegistrar.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import {
  type BacklogMCPServer,
  wrapServerWithToolRegistry,
} from './utils/wrapServerWithToolRegistry.js';
import type { MCPOptions } from './types/mcp.js';

export type CreateBacklogMcpServerConfig = {
  version: string;
  useFields: boolean;
  backlog: Backlog;
  transHelper: TranslationHelper;
  enabledToolsets: string[];
  mcpOption: MCPOptions;
  dynamicToolsets: boolean;
};

/**
 * Builds a fresh MCP server instance with all Backlog tools registered.
 * Used once for stdio; one instance per HTTP session for Streamable HTTP.
 */
export function createBacklogMcpServer({
  version,
  useFields,
  backlog,
  transHelper,
  enabledToolsets,
  mcpOption,
  dynamicToolsets,
}: CreateBacklogMcpServerConfig): BacklogMCPServer {
  const server = wrapServerWithToolRegistry(
    new McpServer({
      name: 'backlog',
      title: useFields ? 'backlog (field selection enabled)' : 'backlog',
      version,
    })
  );

  const toolsetGroup = buildToolsetGroup(backlog, transHelper, enabledToolsets);
  registerTools(server, toolsetGroup, mcpOption);

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
