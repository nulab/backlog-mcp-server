import { markWatchingAsReadTool } from './markWatchingAsRead.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('markWatchingAsReadTool', () => {
  const mockBacklog: Partial<Backlog> = {
    resetWatchingListItemAsRead: vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = markWatchingAsReadTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns success message as formatted JSON text', async () => {
    const result = await tool.handler({
      watchId: 123,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.success).toBe(true);
  });

  it('calls backlog.resetWatchingListItemAsRead with correct params', async () => {
    await tool.handler({
      watchId: 123,
    });

    expect(mockBacklog.resetWatchingListItemAsRead).toHaveBeenCalledWith(123);
  });
});
