#!/usr/bin/env node
// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as backlogjs from 'backlog-js';
import { config } from './config.js';
import { createTranslationHelper } from './createTranslationHelper.js';
import { ProjectGuardService } from './guards/ProjectGuardService.js';
import { registerDyamicTools, registerTools } from './registerTools.js';
import { dynamicTools } from './tools/dynamicTools/toolsets.js';
import { logger } from './utils/logger.js';
import { createToolRegistrar } from './utils/toolRegistrar.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import { wrapServerWithToolRegistry } from './utils/wrapServerWithToolRegistry.js';
import { VERSION } from './version.js';

const backlog = new backlogjs.Backlog({
  host: config.backlogDomain,
  apiKey: config.backlogApiKey,
});

const useFields = config.optimizeResponse;

const server = wrapServerWithToolRegistry(
  new McpServer({
    name: 'backlog',
    description: useFields
      ? `You can include only the fields you need using GraphQL-style syntax.
Start with the example above and customize freely.`
      : undefined,
    version: VERSION,
  })
);

const transHelper = createTranslationHelper();

const maxTokens = config.maxTokens;
const prefix = config.prefix;
let enabledToolsets = config.enableToolsets as string[];

// If dynamic toolsets are enabled, remove "all" to allow for selective enabling via commands
if (config.dynamicToolsets) {
  enabledToolsets = enabledToolsets.filter((a) => a != 'all');
}

const mcpOption = { useFields: useFields, maxTokens, prefix };
const toolsetGroup = buildToolsetGroup(backlog, transHelper, enabledToolsets);

async function start() {
  // Register all tools
  const guardService = new ProjectGuardService(backlog, {
    allowedProjectIds: config.allowedProjectIds as (string | number)[],
    allowedProjectKeys: config.allowedProjectKeys as string[],
    keyResolveTtlSec: config.keyResolveTtlSec,
  });

  await guardService.initialize();

  registerTools(server, toolsetGroup, mcpOption, guardService, backlog);

  // Register dynamic tool management tools if enabled
  if (config.dynamicToolsets) {
    const registrar = createToolRegistrar(server, toolsetGroup, mcpOption, guardService, backlog);
    const dynamicToolsetGroup = dynamicTools(
      registrar,
      transHelper,
      toolsetGroup
    );

    registerDyamicTools(server, dynamicToolsetGroup, prefix);
  }

  if (config.exportTranslations) {
    const data = transHelper.dump();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Backlog MCP Server running on stdio');
}

start()
  .then(main)
  .catch((error) => {
    logger.error({ err: error }, 'Fatal error in main()');
    process.exit(1);
  });
