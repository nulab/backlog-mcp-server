import type { MiddlewareHandler } from 'hono';
import {
  hasBacklogAuthErrorBeenReported,
  runWithAccessToken,
} from './backlogAuthContext.js';
import { resolveBacklogHost, runWithBacklogHost } from './backlogHost.js';

export type TokenPassthroughOptions = {
  defaultHost?: string;
};

// The bearer token is a Backlog access token held by a gateway in front of this server.
// It is not verified here: Backlog rejects a bad one on the first real call.
export function createTokenPassthroughMiddleware({
  defaultHost,
}: TokenPassthroughOptions = {}): MiddlewareHandler {
  return async (c, next) => {
    const unauthorized = (description: string) => {
      c.header('WWW-Authenticate', 'Bearer error="invalid_token"');
      return c.json(
        { error: 'invalid_token', error_description: description },
        401
      );
    };

    const [type, token] = (c.req.header('authorization') ?? '').split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      return unauthorized('Missing Backlog access token');
    }

    const host = resolveBacklogHost(
      c.req.header('x-backlog-host'),
      defaultHost
    );
    if (!host) {
      return c.json(
        {
          error: 'invalid_host',
          error_description: 'Missing or invalid X-Backlog-Host',
        },
        400
      );
    }

    await runWithBacklogHost(host, () =>
      runWithAccessToken(token, async () => {
        await next();
        // The SDK's 2025-era fallback always streams, committing 200 before the tool runs.
        // Stateless streams end with the result, so read it whole before deciding the status.
        if (c.res.headers.get('content-type')?.includes('text/event-stream')) {
          const { status, headers } = c.res;
          c.res = new Response(await c.res.text(), { status, headers });
        }
        // A 401 tells the gateway to refresh the token and retry; a tool error would not.
        if (hasBacklogAuthErrorBeenReported()) {
          c.res = unauthorized('Backlog rejected the access token');
        }
      })
    );
  };
}
