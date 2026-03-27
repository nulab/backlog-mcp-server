import { addWatchingTool } from './addWatching.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('addWatchingTool', () => {
  const mockBacklog: Partial<Backlog> = {
    postWatchingListItem: vi.fn<() => Promise<any>>().mockResolvedValue({
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
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = addWatchingTool(mockBacklog as Backlog, mockTranslationHelper);

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

  it('calls backlog.postWatchingListItem with correct params when using issue key', async () => {
    await tool.handler({
      issueIdOrKey: 'TEST-1',
      note: 'Watching this issue',
    });

    expect(mockBacklog.postWatchingListItem).toHaveBeenCalledWith({
      issueIdOrKey: 'TEST-1',
      note: 'Watching this issue',
    });
  });

  it('calls backlog.postWatchingListItem with correct params when using issue ID', async () => {
    await tool.handler({
      issueIdOrKey: 1,
      note: 'Important issue',
    });

    expect(mockBacklog.postWatchingListItem).toHaveBeenCalledWith({
      issueIdOrKey: 1,
      note: 'Important issue',
    });
  });
});
