import { updateIssueCommentTool } from './updateIssueComment.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { patchIssueComment } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  patchIssueComment: vi.fn(),
}));

describe('updateIssueCommentTool', () => {
  vi.mocked(patchIssueComment).mockResolvedValue({
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
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = updateIssueCommentTool(mockClient, mockDescriptionHelper);

  it('returns updated comment', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
      commentId: 3,
      content: 'Updated comment content',
    });

    expect(result).toHaveProperty('content', 'Updated comment content');
    expect(result).toHaveProperty('id', 3);
  });

  it('calls patchIssueComment with correct params when using issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      commentId: 3,
      content: 'Updated comment content',
    });

    expect(patchIssueComment).toHaveBeenCalledWith(mockClient, 'TEST-1', 3, {
      content: 'Updated comment content',
    });
  });

  it('calls patchIssueComment with correct params when using issue ID', async () => {
    await tool.handler({
      issueId: 1,
      commentId: 3,
      content: 'Updated comment content via issueId',
    });

    expect(patchIssueComment).toHaveBeenCalledWith(mockClient, 1, 3, {
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
