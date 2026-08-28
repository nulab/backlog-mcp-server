#!/usr/bin/env node
// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { default as env } from 'env-var';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getBacklogOAuthConfig } from './auth/backlogOAuthConfig.js';
import { loadTokenStoreModule } from './auth/loadTokenStoreModule.js';
import { createTokenStore } from './auth/tokenStore.js';
import type { TokenStore } from './auth/tokenStore.js';
import { createDescriptionHelper } from './createDescriptionHelper.js';
import { loadDescriptionOverrides } from './loadDescriptionOverrides.js';
import { createBacklogMcpServer } from './createBacklogMcpServer.js';
import { runHttpMcpServer } from './httpMcpServer.js';
import { reportUnknownOverrideKeys } from './reportUnknownOverrideKeys.js';
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
  .option('http-allowed-origins', {
    type: 'string',
    describe:
      'Comma-separated allowed Origin header hostnames for browser-based clients. Defaults to the localhost set on a loopback bind, and to no Origin check otherwise',
    default: env.get('MCP_HTTP_ALLOWED_ORIGINS').default('').asString(),
  })
  .option('token-store-module', {
    type: 'string',
    describe:
      'Path or package name of a module whose default export builds the OAuth TokenStore. Defaults to an in-memory store, which is lost on restart and not shared between instances',
    default: env.get('MCP_TOKEN_STORE_MODULE').default('').asString(),
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
  .option('export-descriptions', {
    type: 'boolean',
    // Deprecated alias, to be removed in a future release. Kept because the old name is
    // documented with docker and npx examples, and dropping it outright would
    // not fail loudly: yargs ignores unknown flags, so the process would fall
    // through to starting a server and the caller would see a hang.
    alias: 'export-translations',
    describe: 'Export tool and parameter descriptions and exit',
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
  .parseSync();

// The alias resolves both spellings to the same argv key, so which one was typed
// is only visible in the raw arguments. Written straight to stderr rather than
// through `logger`, which drops anything below `error` in production — and stdout
// carries the JSON-RPC stream, so a notice there would corrupt the protocol.
if (
  hideBin(process.argv).some(
    (arg) => arg.split('=')[0] === '--export-translations'
  )
) {
  process.stderr.write(
    '--export-translations is deprecated and will be removed in a future release. Use --export-descriptions.\n'
  );
}

// Dynamic toolsets are gone. yargs ignores the unknown flag, so without this the
// server would start with a quietly different tool list: the flag used to drop
// `all` from the enabled toolsets, so a setup that passed only this one went from
// no toolsets plus three meta-tools to every toolset enabled.
//
// Only worth saying to someone who had it switched on. A setting left at `false`
// asked for what it now gets, so a notice claiming the tool list changed would be
// wrong.
const asksForDynamicToolsets = (value: string | undefined): boolean =>
  value !== undefined &&
  !['', '0', 'false', 'no'].includes(value.toLowerCase());

const dynamicToolsetsFlag = hideBin(process.argv).find(
  (arg) => arg.split('=')[0] === '--dynamic-toolsets'
);

if (
  (dynamicToolsetsFlag !== undefined &&
    asksForDynamicToolsets(dynamicToolsetsFlag.split('=')[1] ?? 'true')) ||
  asksForDynamicToolsets(process.env.ENABLE_DYNAMIC_TOOLSETS)
) {
  process.stderr.write(
    'Dynamic toolsets have been removed, and --dynamic-toolsets / ENABLE_DYNAMIC_TOOLSETS no longer do anything. Every toolset is enabled unless you narrow it with --enable-toolsets or ENABLE_TOOLSETS.\n'
  );
}

const clientRegistry = oauthConfig
  ? createOAuthBacklogClientRegistry(oauthConfig.backlogDomain)
  : createBacklogClientRegistry();
const backlog = clientRegistry.createScopedClient();

let cleanupTimer: ReturnType<typeof setInterval> | undefined;

// Loading an external store needs `await import`, so the store is built inside
// `main()` rather than at module scope. Without `--token-store-module` this is
// the same in-memory store as before, built at the same point in the startup
// sequence relative to everything that reads it.
const createConfiguredTokenStore = async (): Promise<
  TokenStore | undefined
> => {
  if (!oauthConfig) return undefined;

  const specifier = argv.tokenStoreModule.trim();
  const store = specifier
    ? await loadTokenStoreModule(specifier)
    : createTokenStore();

  // An external store's cleanup can reject, and an unhandled rejection would
  // take the process down through the handler installed above.
  cleanupTimer = setInterval(
    () => {
      void Promise.resolve(store.cleanup()).catch((err) =>
        logger.error({ err }, 'Token store cleanup failed')
      );
    },
    5 * 60 * 1000
  );
  cleanupTimer.unref();

  return store;
};

const useFields = argv.optimizeResponse;

const descriptionOverrides = loadDescriptionOverrides();
const descriptionHelper = createDescriptionHelper(descriptionOverrides);

const maxTokens = argv.maxTokens;
const prefix = argv.prefix;
const enabledToolsets = argv.enableToolsets as string[];

const mcpOption = {
  useFields: useFields,
  maxTokens,
  prefix,
  useOrganization: clientRegistry.isMultiOrganization,
};

// Built once and shared by every server the factory produces. Nothing mutates
// it, so this is purely to avoid rebuilding the whole tool tree per request under
// the stateless HTTP model.
const sharedToolsetGroup = buildToolsetGroup(
  backlog,
  descriptionHelper,
  enabledToolsets
);

reportUnknownOverrideKeys({
  overrides: descriptionOverrides,
  version,
  backlog,
  clientRegistry,
  mcpOption,
});

// Factory: creates a fresh MCP server with all tools registered.
// Used once per stdio connection; one fresh instance per HTTP request.
const createServer = () =>
  createBacklogMcpServer({
    version,
    useFields,
    backlog,
    clientRegistry,
    descriptionHelper,
    enabledToolsets,
    mcpOption,
    toolsetGroup: sharedToolsetGroup,
  });

if (argv.exportDescriptions) {
  // Description keys are only recorded once a tool asks for them, so build a
  // server with every toolset enabled before dumping. Without this the dump is
  // empty, because no tool has been created yet at this point.
  createBacklogMcpServer({
    version,
    useFields,
    backlog,
    clientRegistry,
    descriptionHelper,
    enabledToolsets: ['all'],
    mcpOption,
  });
  const data = descriptionHelper.dump();
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
  const tokenStore = await createConfiguredTokenStore();

  if (oauthConfig && argv.transport === 'stdio') {
    logger.warn(
      'OAuth is configured but transport is stdio. OAuth is only available with HTTP transport.'
    );
  }

  if (argv.transport === 'http') {
    const httpPath = normalizeHttpPath(argv.httpPath);
    const parseHostList = (raw?: string): string[] | undefined =>
      raw && raw.trim().length > 0
        ? raw
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean)
        : undefined;

    const allowedHosts = parseHostList(argv.httpAllowedHosts);
    const allowedOrigins = parseHostList(argv.httpAllowedOrigins);

    const { shutdown } = await runHttpMcpServer({
      host: argv.httpHost,
      port: argv.httpPort,
      path: httpPath,
      version,
      enableJsonResponse: argv.httpJsonResponse,
      allowedHosts,
      allowedOrigins,
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
