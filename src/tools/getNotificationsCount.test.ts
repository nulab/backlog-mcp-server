import { getNotificationsCountTool } from './getNotificationsCount.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getNotificationsCount } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getNotificationsCount: vi.fn(),
}));

describe('getNotificationsCountTool', () => {
  vi.mocked(getNotificationsCount).mockResolvedValue({
    count: 42,
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getNotificationsCountTool(mockClient, mockDescriptionHelper);

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

  it('calls getNotificationsCount with correct params', async () => {
    const params = {
      alreadyRead: true,
      resourceAlreadyRead: false,
    };

    await tool.handler(params);

    expect(getNotificationsCount).toHaveBeenCalledWith(mockClient, params);
  });
});
