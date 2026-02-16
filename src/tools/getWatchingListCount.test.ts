import { getWatchingListCountTool } from './getWatchingListCount.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getWatchingListCountTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getWatchingListCount: vi.fn<() => Promise<any>>().mockResolvedValue({
      count: 42,
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getWatchingListCountTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns watching list count as formatted JSON text', async () => {
    const result = await tool.handler({
      userId: 1,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.count).toEqual(42);
  });

  it('calls backlog.getWatchingListCount with correct params', async () => {
    await tool.handler({
      userId: 1,
    });

    expect(mockBacklog.getWatchingListCount).toHaveBeenCalledWith(1);
  });
});
