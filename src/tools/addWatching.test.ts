import { addWatchingTool } from './addWatching.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { postWatchingListItem } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  postWatchingListItem: vi.fn(),
}));

describe('addWatchingTool', () => {
  vi.mocked(postWatchingListItem).mockResolvedValue({
    id: 1,
    resourceAlreadyRead: false,
    note: 'Watching this issue',
    type: 'issue',
    issue: {
      id: 1000,
      projectId: 100,
      issueKey: 'TEST-1',
      summary: 'Test issue',
    },
    created: '2023-01-01T00:00:00Z',
    updated: '2023-01-01T00:00:00Z',
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = addWatchingTool(mockClient, mockDescriptionHelper);

  it('returns created watching item as formatted JSON text', async () => {
    const result = await tool.handler({
      issueIdOrKey: 'TEST-1',
      note: 'Watching this issue',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result).toHaveProperty('id');
    expect(result.note).toBe('Watching this issue');
  });

  it('calls postWatchingListItem with correct params when using issue key', async () => {
    await tool.handler({
      issueIdOrKey: 'TEST-1',
      note: 'Watching this issue',
    });

    expect(postWatchingListItem).toHaveBeenCalledWith(mockClient, {
      issueIdOrKey: 'TEST-1',
      note: 'Watching this issue',
    });
  });

  it('calls postWatchingListItem with correct params when using issue ID', async () => {
    await tool.handler({
      issueIdOrKey: 1,
      note: 'Important issue',
    });

    expect(postWatchingListItem).toHaveBeenCalledWith(mockClient, {
      issueIdOrKey: 1,
      note: 'Important issue',
    });
  });
});
