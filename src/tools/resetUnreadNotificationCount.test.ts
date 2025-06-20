import { resetUnreadNotificationCountTool } from './resetUnreadNotificationCount.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('resetUnreadNotificationCountTool', () => {
  const mockBacklog: Partial<Backlog> = {
    resetNotificationsMarkAsRead: jest
      .fn<() => Promise<any>>()
      .mockResolvedValue({
        count: 0,
      }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = resetUnreadNotificationCountTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns reset result as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.count).toEqual(0);
  });

  it('calls backlog.resetNotificationsMarkAsRead', async () => {
    await tool.handler({});

    expect(mockBacklog.resetNotificationsMarkAsRead).toHaveBeenCalled();
  });
});
