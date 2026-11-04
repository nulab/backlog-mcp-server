import { getNotificationsTool } from './getNotifications.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getNotifications } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getNotifications: vi.fn(),
}));

describe('getNotificationsTool', () => {
  vi.mocked(getNotifications).mockResolvedValue([
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
  ] as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getNotificationsTool(mockClient, mockDescriptionHelper);

  it('returns notifications list as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result[0].issue?.summary).toContain('Test Issue');
    expect(result[1].issue?.summary).toContain('Another Issue');
  });

  it('calls getNotifications with correct params', async () => {
    const params = {
      minId: 100,
      maxId: 200,
      count: 20,
      order: 'desc' as const,
    };

    await tool.handler(params);

    expect(getNotifications).toHaveBeenCalledWith(mockClient, params);
  });
});
