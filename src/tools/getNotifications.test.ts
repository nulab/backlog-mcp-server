import { getNotificationsTool } from './getNotifications.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getNotificationsTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getNotifications: vi.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 1,
        alreadyRead: false,
        resourceAlreadyRead: false,
        reason: 1,
        user: {
          id: 1,
          userId: 'user1',
          name: 'User One',
        },
        project: {
          id: 1,
          projectKey: 'TEST',
          name: 'Test Project',
        },
        issue: {
          id: 1,
          issueKey: 'TEST-1',
          summary: 'Test Issue',
        },
        comment: {
          id: 1,
          content: 'Test comment',
        },
        created: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        alreadyRead: true,
        resourceAlreadyRead: true,
        reason: 2,
        user: {
          id: 2,
          userId: 'user2',
          name: 'User Two',
        },
        project: {
          id: 1,
          projectKey: 'TEST',
          name: 'Test Project',
        },
        issue: {
          id: 2,
          issueKey: 'TEST-2',
          summary: 'Another Issue',
        },
        created: '2023-01-02T00:00:00Z',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getNotificationsTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns notifications list as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result[0].issue?.summary).toContain('Test Issue');
    expect(result[1].issue?.summary).toContain('Another Issue');
  });

  it('calls backlog.getNotifications with correct params', async () => {
    const params = {
      minId: 100,
      maxId: 200,
      count: 20,
      order: 'desc' as const,
    };

    await tool.handler(params);

    expect(mockBacklog.getNotifications).toHaveBeenCalledWith(params);
  });
});
