import { getWatchingListCountTool } from './getWatchingListCount.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getWatchingListCount } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getWatchingListCount: vi.fn(),
}));

describe('getWatchingListCountTool', () => {
  vi.mocked(getWatchingListCount).mockResolvedValue({
    count: 42,
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getWatchingListCountTool(mockClient, mockDescriptionHelper);

  it('returns watching list count as formatted JSON text', async () => {
    const result = await tool.handler({
      userId: 1,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.count).toEqual(42);
  });

  it('calls getWatchingListCount with correct params', async () => {
    await tool.handler({
      userId: 1,
    });

    expect(getWatchingListCount).toHaveBeenCalledWith(mockClient, 1);
  });
});
