#!/usr/bin/env node
// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { default as env } from 'env-var';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createTranslationHelper } from './createTranslationHelper.js';
import { createBacklogMcpServer } from './createBacklogMcpServer.js';
import { createBacklogClientRegistry } from './utils/backlogClientRegistry.js';
import { logger } from './utils/logger.js';
import packageJson from '../package.json' with { type: 'json' };

const { version } = packageJson;

// Swallow SIGPIPE and stdout/stderr EPIPE so the process doesn't crash when a
// client disconnects mid-stream. Node.js emits EPIPE as both a Unix signal and
// as an error event on stdout/stderr streams — both must be handled.
process.on('SIGPIPE', () => {});
process.stdout.on('error', (err) => {
  if (!('code' in err) || err.code !== 'EPIPE') throw err;
});
process.stderr.on('error', (err) => {
  if (!('code' in err) || err.code !== 'EPIPE') throw err;
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
  process.exit(1);
});

try {
  process.loadEnvFile();
} catch {
  // .env file is optional
}

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

const clientRegistry = createBacklogClientRegistry();
const backlog = clientRegistry.createScopedClient();

const useFields = argv.optimizeResponse;

const transHelper = createTranslationHelper();

const maxTokens = argv.maxTokens;
const prefix = argv.prefix;
const enabledToolsets = argv.dynamicToolsets
  ? (argv.enableToolsets as string[]).filter((a) => a !== 'all')
  : (argv.enableToolsets as string[]);

const mcpOption = { useFields: useFields, maxTokens, prefix };

// Factory: creates a fresh MCP server with all tools registered.
const createServer = () =>
  createBacklogMcpServer({
    version,
    useFields,
    backlog,
    clientRegistry,
    transHelper,
    enabledToolsets,
    mcpOption,
    dynamicToolsets: argv.dynamicToolsets,
  });

if (argv.exportTranslations) {
  const data = transHelper.dump();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Backlog MCP Server running on stdio');
}

main().catch((error) => {
  logger.error({ err: error }, 'Fatal error in main()');
  process.exit(1);
});
