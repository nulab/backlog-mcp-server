#!/usr/bin/env node
// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as backlogjs from 'backlog-js';
import dotenv from 'dotenv';
import { default as env } from 'env-var';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createTranslationHelper } from './createTranslationHelper.js';
import { registerDyamicTools, registerTools } from './registerTools.js';
import { dynamicTools } from './tools/dynamicTools/toolsets.js';
import { logger } from './utils/logger.js';
import { createToolRegistrar } from './utils/toolRegistrar.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import { wrapServerWithToolRegistry } from './utils/wrapServerWithToolRegistry.js';
import { VERSION } from './version.js';

dotenv.config();

const domain = env.get('BACKLOG_DOMAIN').required().asString();

const apiKey = env.get('BACKLOG_API_KEY').required().asString();

const backlog = new backlogjs.Backlog({ host: domain, apiKey: apiKey });

const argv = yargs(hideBin(process.argv))
  .option('max-tokens', {
    type: 'number',
    describe: 'Maximum number of tokens allowed in the response',
    default: env.get('MAX_TOKENS').default('50000').asIntPositive(),
  })
  .option('optimize-response', {
    type: 'boolean',
    describe:
      'Enable GraphQL-style response optimization to include only requested fields',
    default: env.get('OPTIMIZE_RESPONSE').default('false').asBool(),
  })
  .option('prefix', {
    type: 'string',
    describe: 'Optional string prefix to prepend to all generated outputs',
    default: env.get('PREFIX').default('').asString(),
  })
  .option('export-translations', {
    type: 'boolean',
    describe: 'Export translations and exit',
    default: false,
  })
  .option('enable-toolsets', {
    type: 'array',
    describe: `Specify which toolsets to enable. Defaults to 'all'.
Available toolsets:
  - space:       Tools for managing Backlog space settings and general information
  - project:     Tools for managing projects, categories, custom fields, and issue types
  - issue:       Tools for managing issues and their comments
  - wiki:        Tools for managing wiki pages
  - git:         Tools for managing Git repositories and pull requests
  - notifications: Tools for managing user notifications`,
    default: env.get('ENABLE_TOOLSETS').default('all').asArray(','),
  })
  .option('dynamic-toolsets', {
    type: 'boolean',
    describe:
      'Enable dynamic toolsets such as enable_toolset, list_available_toolsets, etc.',
    default: env.get('ENABLE_DYNAMIC_TOOLSETS').default('false').asBool(),
  })
  .parseSync();

const useFields = argv.optimizeResponse;

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

const maxTokens = argv.maxTokens;
const prefix = argv.prefix;
let enabledToolsets = argv.enableToolsets as string[];

// If dynamic toolsets are enabled, remove "all" to allow for selective enabling via commands
if (argv.dynamicToolsets) {
  enabledToolsets = enabledToolsets.filter((a) => a != 'all');
}

const mcpOption = { useFields: useFields, maxTokens, prefix };
const toolsetGroup = buildToolsetGroup(backlog, transHelper, enabledToolsets);

// Register all tools
registerTools(server, toolsetGroup, mcpOption);

// Register dynamic tool management tools if enabled
if (argv.dynamicToolsets) {
  const registrar = createToolRegistrar(server, toolsetGroup, mcpOption);
  const dynamicToolsetGroup = dynamicTools(
    registrar,
    transHelper,
    toolsetGroup
  );

  registerDyamicTools(server, dynamicToolsetGroup, prefix);
}

if (argv.exportTranslations) {
  const data = transHelper.dump();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Backlog MCP Server running on stdio');
}

main().catch((error) => {
  logger.error({ err: error }, 'Fatal error in main()');
  process.exit(1);
});
