#!/usr/bin/env node
// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { default as env } from 'env-var';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getBacklogOAuthConfig } from './auth/backlogOAuthConfig.js';
import { createTokenStore } from './auth/tokenStore.js';
import { createTranslationHelper } from './createTranslationHelper.js';
import { createBacklogMcpServer } from './createBacklogMcpServer.js';
import { runHttpMcpServer } from './httpMcpServer.js';
import {
  createBacklogClientRegistry,
  createOAuthBacklogClientRegistry,
} from './utils/backlogClientRegistry.js';
import { logger } from './utils/logger.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
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

const oauthConfig = getBacklogOAuthConfig();

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

const clientRegistry = oauthConfig
  ? createOAuthBacklogClientRegistry(oauthConfig.backlogDomain)
  : createBacklogClientRegistry();
const backlog = clientRegistry.createScopedClient();

const tokenStore = oauthConfig ? createTokenStore() : undefined;
let cleanupTimer: ReturnType<typeof setInterval> | undefined;
if (tokenStore) {
  cleanupTimer = setInterval(() => tokenStore.cleanup(), 5 * 60 * 1000);
  cleanupTimer.unref();
}

const useFields = argv.optimizeResponse;

const transHelper = createTranslationHelper();

const maxTokens = argv.maxTokens;
const prefix = argv.prefix;
const enabledToolsets = argv.dynamicToolsets
  ? (argv.enableToolsets as string[]).filter((a) => a !== 'all')
  : (argv.enableToolsets as string[]);

const mcpOption = { useFields: useFields, maxTokens, prefix };

// Built once and shared by every server the factory produces. `enable_toolset`
// mutates this group, and the stateless HTTP model discards its server after
// each request — so a per-server group would lose the enablement immediately.
// Sharing it makes toolset state process-wide, which is the only scope left now
// that the protocol has no sessions.
const sharedToolsetGroup = buildToolsetGroup(
  backlog,
  transHelper,
  enabledToolsets
);

// Factory: creates a fresh MCP server with all tools registered.
// Used once per stdio connection; one fresh instance per HTTP request.
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
    toolsetGroup: sharedToolsetGroup,
  });

if (argv.exportTranslations) {
  // Translation keys are only recorded once a tool asks for them, so build a
  // server with every toolset enabled before dumping. Without this the dump is
  // empty, because no tool has been created yet at this point.
  createBacklogMcpServer({
    version,
    useFields,
    backlog,
    clientRegistry,
    transHelper,
    enabledToolsets: ['all'],
    mcpOption,
    dynamicToolsets: true,
  });
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
  if (oauthConfig && argv.transport === 'stdio') {
    logger.warn(
      'OAuth is configured but transport is stdio. OAuth is only available with HTTP transport.'
    );
  }

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
      oauthConfig,
      tokenStore,
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
        oauth: !!oauthConfig,
      },
      oauthConfig
        ? 'Backlog MCP Server listening (Streamable HTTP + OAuth)'
        : 'Backlog MCP Server listening (Streamable HTTP)'
    );
    return;
  }

  // serveStdio owns the era decision for the connection: it pins one instance
  // from the factory, serving both 2026-07-28 and 2025-era clients.
  serveStdio(createServer, {
    onerror: (err) => logger.error({ err }, 'MCP stdio error'),
  });
  logger.info('Backlog MCP Server running on stdio');
}

main().catch((error) => {
  logger.error({ err: error }, 'Fatal error in main()');
  process.exit(1);
});
