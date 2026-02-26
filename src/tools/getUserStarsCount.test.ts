import { getUserStarsCountTool } from './getUserStarsCount.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getUserStarsCountTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getUserStarsCount: vi.fn<() => Promise<any>>().mockResolvedValue({
      count: 54,
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getUserStarsCountTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns star count', async () => {
    const result = await tool.handler({ userId: 1 });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.count).toEqual(54);
  });

  it('calls backlog.getUserStarsCount with userId and empty params', async () => {
    await tool.handler({ userId: 1 });

    expect(mockBacklog.getUserStarsCount).toHaveBeenCalledWith(1, {
      since: undefined,
      until: undefined,
    });
  });

  it('calls backlog.getUserStarsCount with since and until params', async () => {
    await tool.handler({ userId: 1, since: '2024-01-01', until: '2024-12-31' });

    expect(mockBacklog.getUserStarsCount).toHaveBeenCalledWith(1, {
      since: '2024-01-01',
      until: '2024-12-31',
    });
  });
});
