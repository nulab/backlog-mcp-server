import { resetUnreadNotificationCountTool } from './resetUnreadNotificationCount.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { resetNotificationsMarkAsRead } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  resetNotificationsMarkAsRead: vi.fn(),
}));

describe('resetUnreadNotificationCountTool', () => {
  vi.mocked(resetNotificationsMarkAsRead).mockResolvedValue({
    count: 0,
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = resetUnreadNotificationCountTool(
    mockClient,
    mockDescriptionHelper
  );

  it('returns reset result as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.count).toEqual(0);
  });

  it('calls resetNotificationsMarkAsRead', async () => {
    await tool.handler({});

    expect(resetNotificationsMarkAsRead).toHaveBeenCalledWith(mockClient);
  });
});
