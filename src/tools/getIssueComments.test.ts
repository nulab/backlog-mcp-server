import { getIssueCommentsTool } from './getIssueComments.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getIssueCommentsTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getIssueComments: jest.fn<() => Promise<any>>().mockResolvedValue([
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
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getIssueCommentsTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

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

  it('calls backlog.getIssueComments with correct params when using issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      count: 10,
      order: 'desc',
    });

    expect(mockBacklog.getIssueComments).toHaveBeenCalledWith('TEST-1', {
      count: 10,
      order: 'desc',
    });
  });

  it('calls backlog.getIssueComments with correct params when using issue ID and min/max IDs', async () => {
    await tool.handler({
      issueId: 1,
      minId: 100,
      maxId: 200,
    });

    expect(mockBacklog.getIssueComments).toHaveBeenCalledWith(1, {
      // Expect number
      minId: 100,
      maxId: 200,
    });
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });
});
