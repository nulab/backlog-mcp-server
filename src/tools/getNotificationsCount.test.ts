import { getNotificationsCountTool } from './getNotificationsCount.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getNotificationsCountTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getNotificationsCount: vi.fn<() => Promise<any>>().mockResolvedValue({
      count: 42,
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getNotificationsCountTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns notification count as formatted JSON text', async () => {
    const result = await tool.handler({
      alreadyRead: false,
      resourceAlreadyRead: false,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.count).toEqual(42);
  });

  it('calls backlog.getNotificationsCount with correct params', async () => {
    const params = {
      alreadyRead: true,
      resourceAlreadyRead: false,
    };

    await tool.handler(params);

    expect(mockBacklog.getNotificationsCount).toHaveBeenCalledWith(params);
  });
});
