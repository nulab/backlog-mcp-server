// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { ExportedHandler } from '@cloudflare/workers-types';
import { BacklogMcpDurableObject } from './workers/durableObject.js';
import type { WorkerEnv } from './workers/env.js';

// Durable Object class must be exported from the Worker entry so the runtime
// can instantiate it for the `MCP_DO` binding.
export { BacklogMcpDurableObject };

/**
 * Cloudflare Workers entry point.
 *
 * All requests are forwarded to a single global Durable Object instance, which
 * owns the OAuth state and MCP sessions. Routing every request to one instance
 * keeps the OAuth flow and stateful sessions strongly consistent.
 */
const handler: ExportedHandler<WorkerEnv> = {
  fetch(request, env) {
    const id = env.MCP_DO.idFromName('global');
    return env.MCP_DO.get(id).fetch(request);
  },
};

export default handler;
