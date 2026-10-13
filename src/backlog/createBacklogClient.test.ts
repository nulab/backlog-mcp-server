import { Backlog } from 'backlog-js';
import { describe, it, expect } from 'vite-plus/test';
import { createBacklogClient } from './createBacklogClient.js';

describe('createBacklogClient', () => {
  it('creates a Backlog client for the given space', () => {
    const client = createBacklogClient({
      host: 'example.backlog.com',
      accessToken: 'token',
      userAgent: 'consumer/1.0.0',
    });

    expect(client).toBeInstanceOf(Backlog);
    expect(client.restBaseURL).toBe('https://example.backlog.com/api/v2');
  });
});
