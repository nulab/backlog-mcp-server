import { getUserRecentUpdatesTool } from './getUserRecentUpdates.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getUserActivities } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getUserActivities: vi.fn(),
}));

describe('getUserRecentUpdatesTool', () => {
  vi.mocked(getUserActivities).mockResolvedValue([
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
  ] as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getUserRecentUpdatesTool(mockClient, mockDescriptionHelper);

  it('returns activities list', async () => {
    const result = await tool.handler({ userId: 10 });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result[0].type).toEqual(1);
  });

  it('calls getUserActivities with correct params', async () => {
    const params = {
      userId: 10,
      activityTypeId: [1],
      minId: 10,
      maxId: 20,
      count: 5,
      order: 'desc' as const,
    };

    await tool.handler(params);

    expect(getUserActivities).toHaveBeenCalledWith(mockClient, 10, {
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
