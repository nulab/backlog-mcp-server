import { updateIssueCommentTool } from './updateIssueComment.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('updateIssueCommentTool', () => {
  const mockBacklog: Partial<Backlog> = {
    patchIssueComment: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 3,
      projectId: 1,
      issueId: 1,
      content: 'Updated comment content',
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
      updated: '2023-01-02T00:00:00Z',
      stars: [],
      notifications: [],
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = updateIssueCommentTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns updated comment', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
      commentId: 3,
      content: 'Updated comment content',
    });

    expect(result).toHaveProperty('content', 'Updated comment content');
    expect(result).toHaveProperty('id', 3);
  });

  it('calls backlog.patchIssueComment with correct params when using issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      commentId: 3,
      content: 'Updated comment content',
    });

    expect(mockBacklog.patchIssueComment).toHaveBeenCalledWith('TEST-1', 3, {
      content: 'Updated comment content',
    });
  });

  it('calls backlog.patchIssueComment with correct params when using issue ID', async () => {
    await tool.handler({
      issueId: 1,
      commentId: 3,
      content: 'Updated comment content via issueId',
    });

    expect(mockBacklog.patchIssueComment).toHaveBeenCalledWith(1, 3, {
      content: 'Updated comment content via issueId',
    });
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(
      tool.handler({
        commentId: 3,
        content: 'This should fail due to missing issue identifier',
      } as any)
    ).rejects.toThrow(Error);
  });
});
