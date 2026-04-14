#!/usr/bin/env node
// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { default as env } from 'env-var';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createTranslationHelper } from './createTranslationHelper.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runHttpMcpServer } from './httpMcpServer.js';
import { registerDynamicTools, registerTools } from './registerTools.js';
import { organizationTools } from './tools/dynamicTools/organizations.js';
import { dynamicTools } from './tools/dynamicTools/toolsets.js';
import { createBacklogClientRegistry } from './utils/backlogClientRegistry.js';
import { createToolRegistrar } from './utils/toolRegistrar.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import { wrapServerWithToolRegistry } from './utils/wrapServerWithToolRegistry.js';
import { logger } from './utils/logger.js';
import packageJson from '../package.json' with { type: 'json' };

const { version } = packageJson;

// Swallow SIGPIPE and stdout/stderr EPIPE so the process doesn't crash when a
// client disconnects mid-stream. Node.js emits EPIPE as both a Unix signal and
// as an error event on stdout/stderr streams — both must be handled.
process.on('SIGPIPE', () => {});
process.stdout.on('error', (err) => {
  if (err.code !== 'EPIPE') throw err;
});
process.stderr.on('error', (err) => {
  if (err.code !== 'EPIPE') throw err;
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
  process.exit(1);
});

dotenv.config();

const argv = yargs(hideBin(process.argv))
  .option('transport', {
    type: 'string',
    choices: ['stdio', 'http'] as const,
    describe: 'MCP transport: stdio (default) or Streamable HTTP',
    default:
      env.get('MCP_TRANSPORT').default('stdio').asString().toLowerCase() ===
      'http'
        ? 'http'
        : 'stdio',
  })
  .option('http-host', {
    type: 'string',
    describe: 'Host to bind for HTTP transport',
    default: env.get('MCP_HTTP_HOST').default('127.0.0.1').asString(),
  })
  .option('http-port', {
    type: 'number',
    describe: 'Port for HTTP transport',
    default: env.get('MCP_HTTP_PORT').default(3333).asPortNumber(),
  })
  .option('http-path', {
    type: 'string',
    describe: 'URL path for MCP endpoint (must start with /)',
    default: env.get('MCP_HTTP_PATH').default('/mcp').asString(),
  })
  .option('http-json-response', {
    type: 'boolean',
    describe:
      'Prefer JSON responses over SSE streams when supported (Streamable HTTP)',
    default: env.get('MCP_HTTP_JSON_RESPONSE').default('false').asBool(),
  })
  .option('http-allowed-hosts', {
    type: 'string',
    describe:
      'Comma-separated allowed Host header values when binding to all interfaces (recommended with 0.0.0.0)',
    default: env.get('MCP_HTTP_ALLOWED_HOSTS').default('').asString(),
  })
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
let enabledToolsets = argv.enableToolsets as string[];

// If dynamic toolsets are enabled, remove "all" to allow for selective enabling via commands
if (argv.dynamicToolsets) {
  enabledToolsets = enabledToolsets.filter((a) => a !== 'all');
}

const mcpOption = { useFields: useFields, maxTokens, prefix };

// Factory: creates a fresh MCP server with all tools registered.
// Used once for stdio; one fresh instance per HTTP session for Streamable HTTP.
const createServer = () => {
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
    prefix
  );
  if (argv.dynamicToolsets) {
    const registrar = createToolRegistrar(server, toolsetGroup, mcpOption);
    const dynamicToolsetGroup = dynamicTools(
      registrar,
      transHelper,
      toolsetGroup
    );
    registerDynamicTools(server, dynamicToolsetGroup, prefix);
  }
  return server;
};

if (argv.exportTranslations) {
  const data = transHelper.dump();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

function normalizeHttpPath(p: string): string {
  if (!p.startsWith('/')) {
    return `/${p}`;
  }
  return p;
}

async function main() {
  if (argv.transport === 'http') {
    const httpPath = normalizeHttpPath(argv.httpPath);
    const allowedHostsRaw = argv.httpAllowedHosts;
    const allowedHosts =
      allowedHostsRaw && allowedHostsRaw.trim().length > 0
        ? allowedHostsRaw
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean)
        : undefined;

    const { shutdown } = await runHttpMcpServer({
      host: argv.httpHost,
      port: argv.httpPort,
      path: httpPath,
      version,
      enableJsonResponse: argv.httpJsonResponse,
      allowedHosts,
      createServer,
    });

    process.once('SIGINT', () => {
      void shutdown()
        .catch((err) => logger.error({ err }, 'Error during shutdown'))
        .finally(() => process.exit(0));
    });
    process.once('SIGTERM', () => {
      void shutdown()
        .catch((err) => logger.error({ err }, 'Error during shutdown'))
        .finally(() => process.exit(0));
    });

    logger.info(
      {
        transport: 'http',
        host: argv.httpHost,
        port: argv.httpPort,
        path: httpPath,
      },
      'Backlog MCP Server listening (Streamable HTTP)'
    );
    return;
  }

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Backlog MCP Server running on stdio');
}

main().catch((error) => {
  logger.error({ err: error }, 'Fatal error in main()');
  process.exit(1);
});
