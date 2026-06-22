// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type {
  DurableObjectState,
} from '@cloudflare/workers-types';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { Hono } from 'hono';
import packageJson from '../../package.json' with { type: 'json' };
import { getBacklogOAuthConfig } from '../auth/backlogOAuthConfig.js';
import {
  createDurableTokenStore,
  type KeyValueStorage,
} from '../auth/durableTokenStore.js';
import type { TokenStore } from '../auth/tokenStore.js';
import { createBacklogMcpServer } from '../createBacklogMcpServer.js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import {
  createMcpHonoApp,
  type SessionTransports,
} from '../httpMcpServer.js';
import {
  createBacklogClientRegistry,
  createOAuthBacklogClientRegistry,
  type BacklogClientRegistry,
} from '../utils/backlogClientRegistry.js';
import { logger } from '../utils/logger.js';
import { resolveWorkerConfig } from './config.js';
import type { WorkerEnv } from './env.js';

const { version } = packageJson;

// How often the alarm fires to evict expired OAuth state, mirroring the stdio
// CLI's 5-minute cleanup interval (src/index.ts).
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Durable Object that hosts the stateful MCP + OAuth server for the Cloudflare
 * Workers deployment.
 *
 * A single global instance owns all state: MCP session transports live in
 * memory (volatile SSE streams, re-established on reconnect), while OAuth state
 * is persisted through {@link createDurableTokenStore} to this object's storage
 * so registered clients and tokens survive hibernation and restarts.
 */
export class BacklogMcpDurableObject {
  private readonly state: DurableObjectState;
  private readonly env: WorkerEnv;
  private readonly ready: Promise<void>;
  private readonly transports: SessionTransports = {};
  private app!: Hono<{ Variables: { authInfo?: AuthInfo } }>;
  private tokenStore?: TokenStore;

  constructor(state: DurableObjectState, env: WorkerEnv) {
    this.state = state;
    this.env = env;
    // blockConcurrencyWhile defers all incoming requests until async
    // initialization (storage rehydration, app construction) completes.
    this.ready = state.blockConcurrencyWhile(() => this.initialize());
  }

  /**
   * Builds the OAuth config, Backlog client registry, token store and Hono app,
   * then ensures the periodic cleanup alarm is scheduled.
   */
  private async initialize(): Promise<void> {
    const stringEnv = this.env as unknown as Record<string, string | undefined>;
    const oauthConfig = getBacklogOAuthConfig(stringEnv);

    const clientRegistry: BacklogClientRegistry = oauthConfig
      ? createOAuthBacklogClientRegistry(oauthConfig.backlogDomain)
      : createBacklogClientRegistry({ env: stringEnv });

    this.tokenStore = oauthConfig
      ? await createDurableTokenStore(
          this.state.storage as unknown as KeyValueStorage
        )
      : undefined;

    const cfg = resolveWorkerConfig(this.env);
    const backlog = clientRegistry.createScopedClient();
    const transHelper = createTranslationHelper();
    const mcpOption = {
      useFields: cfg.useFields,
      maxTokens: cfg.maxTokens,
      prefix: cfg.prefix,
    };

    const createServer = () =>
      createBacklogMcpServer({
        version,
        useFields: cfg.useFields,
        backlog,
        clientRegistry,
        transHelper,
        enabledToolsets: cfg.enabledToolsets,
        mcpOption,
        dynamicToolsets: cfg.dynamicToolsets,
      });

    this.app = await createMcpHonoApp({
      path: cfg.mcpPath,
      version,
      enableJsonResponse: cfg.enableJsonResponse,
      allowedHosts: cfg.allowedHosts,
      createServer,
      transports: this.transports,
      oauthConfig,
      tokenStore: this.tokenStore,
    });

    const existingAlarm = await this.state.storage.getAlarm();
    if (existingAlarm === null) {
      await this.state.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS);
    }

    logger.info(
      { oauth: !!oauthConfig, path: cfg.mcpPath },
      'Backlog MCP Durable Object initialized'
    );
  }

  /**
   * Routes an incoming request into the Hono app once initialization is done.
   */
  async fetch(request: Request): Promise<Response> {
    await this.ready;
    return this.app.fetch(request);
  }

  /**
   * Periodic cleanup of expired OAuth state, re-scheduling the next run.
   */
  async alarm(): Promise<void> {
    await this.ready;
    this.tokenStore?.cleanup();
    await this.state.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS);
  }
}
