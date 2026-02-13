import { updateWatchingTool } from './updateWatching.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('updateWatchingTool', () => {
  const mockBacklog: Partial<Backlog> = {
    patchWatchingListItem: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      resourceAlreadyRead: false,
      note: 'Updated note',
      type: 'issue',
      issue: {
        id: 1000,
        projectId: 100,
        issueKey: 'TEST-1',
        summary: 'Test issue',
      },
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-02T00:00:00Z',
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = updateWatchingTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns updated watching item', async () => {
    const result = await tool.handler({
      watchId: 1,
      note: 'Updated note',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result).toHaveProperty('id', 1);
    expect(result.note).toBe('Updated note');
  });

  it('calls backlog.patchWatchingListItem with correct params', async () => {
    await tool.handler({
      watchId: 1,
      note: 'Updated note',
    });

    expect(mockBacklog.patchWatchingListItem).toHaveBeenCalledWith(
      1,
      'Updated note'
    );
  });
});
