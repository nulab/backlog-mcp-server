import { deleteIssueCommentTool } from './deleteIssueComment.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('deleteIssueCommentTool', () => {
  const mockBacklog: Partial<Backlog> = {
    deleteIssueComment: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 100,
      projectId: 1,
      issueId: 10,
      content: 'Deleted comment',
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
      stars: [],
      notifications: [],
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = deleteIssueCommentTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns deleted comment', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
      commentId: 100,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.id).toBe(100);
    expect(result.content).toBe('Deleted comment');
  });

  it('calls backlog.deleteIssueComment with issue key and comment ID', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      commentId: 100,
    });

    expect(mockBacklog.deleteIssueComment).toHaveBeenCalledWith('TEST-1', 100);
  });

  it('calls backlog.deleteIssueComment with issue ID', async () => {
    await tool.handler({
      issueId: 10,
      commentId: 100,
    });

    expect(mockBacklog.deleteIssueComment).toHaveBeenCalledWith(10, 100);
  });

  it('throws if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({ commentId: 100 } as any)).rejects.toThrow(
      Error
    );
  });
});
