import { markWatchingAsReadTool } from './markWatchingAsRead.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { resetWatchingListItemAsRead } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  resetWatchingListItemAsRead: vi.fn(),
}));

describe('markWatchingAsReadTool', () => {
  vi.mocked(resetWatchingListItemAsRead).mockResolvedValue(undefined as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = markWatchingAsReadTool(mockClient, mockDescriptionHelper);

  it('returns success message as formatted JSON text', async () => {
    const result = await tool.handler({
      watchId: 123,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.success).toBe(true);
  });

  it('calls resetWatchingListItemAsRead with correct params', async () => {
    await tool.handler({
      watchId: 123,
    });

    expect(resetWatchingListItemAsRead).toHaveBeenCalledWith(mockClient, 123);
  });
});
