import { markNotificationAsReadTool } from './markNotificationAsRead.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { markAsReadNotification } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  markAsReadNotification: vi.fn(),
}));

describe('markNotificationAsReadTool', () => {
  vi.mocked(markAsReadNotification).mockResolvedValue(undefined as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = markNotificationAsReadTool(mockClient, mockDescriptionHelper);

  it('returns success message as formatted JSON text', async () => {
    const result = await tool.handler({
      id: 123,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.success).toBe(true);
  });

  it('calls markAsReadNotification with correct params', async () => {
    await tool.handler({
      id: 123,
    });

    expect(markAsReadNotification).toHaveBeenCalledWith(mockClient, 123);
  });
});
