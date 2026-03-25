import { getUserRecentUpdatesTool } from './getUserRecentUpdates.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getUserRecentUpdatesTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getUserActivities: vi.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 100,
        project: {
          id: 1,
          projectKey: 'TEST',
          name: 'Test Project',
        },
        type: 1,
        content: { summary: 'Created issue' },
        notifications: [],
        createdUser: {
          id: 10,
          userId: 'user1',
          name: 'User One',
        },
        created: '2023-01-01T00:00:00Z',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getUserRecentUpdatesTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns activities list', async () => {
    const result = await tool.handler({ userId: 10 });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result[0].type).toEqual(1);
  });

  it('calls backlog.getUserActivities with correct params', async () => {
    const params = {
      userId: 10,
      activityTypeId: [1],
      minId: 10,
      maxId: 20,
      count: 5,
      order: 'desc' as const,
    };

    await tool.handler(params);

    expect(mockBacklog.getUserActivities).toHaveBeenCalledWith(10, {
      activityTypeId: [1],
      minId: 10,
      maxId: 20,
      count: 5,
      order: 'desc',
    });
  });

  it('requires userId', () => {
    const result = tool.schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects count less than 1', () => {
    const result = tool.schema.safeParse({ userId: 10, count: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects count greater than 100', () => {
    const result = tool.schema.safeParse({ userId: 10, count: 101 });
    expect(result.success).toBe(false);
  });
});
