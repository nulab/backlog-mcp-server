import { getIssueCommentsTool } from './getIssueComments.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getIssueComments } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getIssueComments: vi.fn(),
}));

describe('getIssueCommentsTool', () => {
  vi.mocked(getIssueComments).mockResolvedValue([
    {
      id: 1,
      content: 'This is the first comment',
      changeLog: [],
      createdUser: {
        id: 1,
        userId: 'admin',
        name: 'Admin User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'admin@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      content: 'This is the second comment',
      changeLog: [],
      createdUser: {
        id: 5,
        userId: 'user',
        name: 'Test User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'test@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      created: '2023-01-02T00:00:00Z',
      updated: '2023-01-02T00:00:00Z',
    },
  ] as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getIssueCommentsTool(mockClient, mockDescriptionHelper);

  it('returns issue comments', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('content', 'This is the first comment');
    expect(result[1]).toHaveProperty('content', 'This is the second comment');
  });

  it('calls getIssueComments with correct params when using issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      count: 10,
      order: 'desc',
    });

    expect(getIssueComments).toHaveBeenCalledWith(mockClient, 'TEST-1', {
      count: 10,
      order: 'desc',
    });
  });

  it('calls getIssueComments with correct params when using issue ID and min/max IDs', async () => {
    await tool.handler({
      issueId: 1,
      minId: 100,
      maxId: 200,
    });

    expect(getIssueComments).toHaveBeenCalledWith(mockClient, 1, {
      // Expect number
      minId: 100,
      maxId: 200,
    });
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });
});
