import { getUserStarsCountTool } from './getUserStarsCount.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getUserStarsCount } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getUserStarsCount: vi.fn(),
}));

describe('getUserStarsCountTool', () => {
  vi.mocked(getUserStarsCount).mockResolvedValue({
    count: 54,
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getUserStarsCountTool(mockClient, mockDescriptionHelper);

  it('returns star count', async () => {
    const result = await tool.handler({ userId: 1 });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.count).toEqual(54);
  });

  it('calls getUserStarsCount with userId and empty params', async () => {
    await tool.handler({ userId: 1 });

    expect(getUserStarsCount).toHaveBeenCalledWith(mockClient, 1, {
      since: undefined,
      until: undefined,
    });
  });

  it('calls getUserStarsCount with since and until params', async () => {
    await tool.handler({ userId: 1, since: '2024-01-01', until: '2024-12-31' });

    expect(getUserStarsCount).toHaveBeenCalledWith(mockClient, 1, {
      since: '2024-01-01',
      until: '2024-12-31',
    });
  });
});
