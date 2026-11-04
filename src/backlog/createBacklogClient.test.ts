import { getSpace } from 'backlog-js';
import { describe, it, expect, vi } from 'vite-plus/test';
import { createBacklogClient } from './createBacklogClient.js';

describe('createBacklogClient', () => {
  it('creates a client that calls the given space', async () => {
    const fetch = vi.fn(
      async () =>
        new Response('{}', {
          headers: { 'Content-Type': 'application/json' },
        })
    );
    const client = createBacklogClient({
      host: 'example.backlog.com',
      accessToken: 'token',
      userAgent: 'consumer/1.0.0',
      fetch,
    });

    await getSpace(client);

    expect(fetch).toHaveBeenCalledWith(
      'https://example.backlog.com/api/v2/space',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'User-Agent': 'consumer/1.0.0',
        }),
      })
    );
  });
});
