import { getWikisCountTool } from './getWikisCount.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getWikisCount } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getWikisCount: vi.fn(),
}));

describe('getWikisCountTool', () => {
  vi.mocked(getWikisCount).mockResolvedValue({
    count: 42,
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getWikisCountTool(mockClient, mockDescriptionHelper);

  it('returns wiki count as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.count).toEqual(42);
  });

  it('calls getWikisCount with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(getWikisCount).toHaveBeenCalledWith(mockClient, 'TEST');
  });

  it('calls getWikisCount with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
    });

    expect(getWikisCount).toHaveBeenCalledWith(mockClient, 100);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
