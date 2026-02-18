import { getWikisCountTool } from './getWikisCount.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getWikisCountTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getWikisCount: vi.fn<() => Promise<any>>().mockResolvedValue({
      count: 42,
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getWikisCountTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns wiki count as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.count).toEqual(42);
  });

  it('calls backlog.getWikisCount with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(mockBacklog.getWikisCount).toHaveBeenCalledWith('TEST');
  });

  it('calls backlog.getWikisCount with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
    });

    expect(mockBacklog.getWikisCount).toHaveBeenCalledWith(100);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
