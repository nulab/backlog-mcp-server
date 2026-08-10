import { resetUnreadNotificationCountTool } from './resetUnreadNotificationCount.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

describe('resetUnreadNotificationCountTool', () => {
  const mockBacklog: Partial<Backlog> = {
    resetNotificationsMarkAsRead: vi
      .fn<() => Promise<any>>()
      .mockResolvedValue({
        count: 0,
      }),
  };

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = resetUnreadNotificationCountTool(
    mockBacklog as Backlog,
    mockDescriptionHelper
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
