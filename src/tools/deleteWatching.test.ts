import { deleteWatchingTool } from './deleteWatching.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('deleteWatchingTool', () => {
  const mockBacklog: Partial<Backlog> = {
    deletehWatchingListItem: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      resourceAlreadyRead: false,
      note: 'Deleted watch',
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
  const tool = deleteWatchingTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('deletes watching', async () => {
    const result = await tool.handler({
      watchId: 1,
    });

    expect(result).toHaveProperty('id', 1);
  });

  it('calls backlog.deletehWatchingListItem with correct params', async () => {
    await tool.handler({
      watchId: 123,
    });

    expect(mockBacklog.deletehWatchingListItem).toHaveBeenCalledWith(123);
  });

  it('handles deletion of different watch IDs', async () => {
    await tool.handler({
      watchId: 456,
    });

    expect(mockBacklog.deletehWatchingListItem).toHaveBeenCalledWith(456);
  });
});
