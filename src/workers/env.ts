// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { DurableObjectNamespace } from '@cloudflare/workers-types';

/**
 * Bindings and vars available to the Worker.
 *
 * String members come from `wrangler.jsonc` `vars` (or `wrangler secret`);
 * `MCP_DO` is the Durable Object binding. The index signature lets the OAuth
 * config reader (`getBacklogOAuthConfig`) and the Backlog client registry read
 * arbitrary `BACKLOG_*` vars by name.
 */
export type WorkerEnv = {
  MCP_DO: DurableObjectNamespace;
  [key: string]: string | DurableObjectNamespace | undefined;
};
