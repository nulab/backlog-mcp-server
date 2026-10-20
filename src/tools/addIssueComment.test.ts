import { addIssueCommentTool } from './addIssueComment.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { postIssueComments } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  postIssueComments: vi.fn(),
}));

describe('addIssueCommentTool', () => {
  vi.mocked(postIssueComments).mockResolvedValue({
    id: 3,
    content: 'This is a new comment',
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
    created: '2023-01-03T00:00:00Z',
    updated: '2023-01-03T00:00:00Z',
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = addIssueCommentTool(mockClient, mockDescriptionHelper);

  it('returns created comment as formatted JSON text', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
      content: 'This is a new comment',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.content).toContain('This is a new comment');
  });

  it('calls postIssueComments with correct params when using issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      content: 'This is a new comment',
    });

    expect(postIssueComments).toHaveBeenCalledWith(mockClient, 'TEST-1', {
      content: 'This is a new comment',
      notifiedUserId: undefined,
      attachmentId: undefined,
    });
  });

  it('calls postIssueComments with correct params when using issue ID and notifications', async () => {
    await tool.handler({
      issueId: 1,
      content: 'This is a new comment with notifications',
      notifiedUserId: [2, 3],
    });

    expect(postIssueComments).toHaveBeenCalledWith(mockClient, 1, {
      content: 'This is a new comment with notifications',
      notifiedUserId: [2, 3],
      attachmentId: undefined,
    });
  });

  it('calls postIssueComments with correct params when using attachments', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      content: 'This is a new comment with attachments',
      attachmentId: [1, 2],
    });

    expect(postIssueComments).toHaveBeenCalledWith(mockClient, 'TEST-1', {
      content: 'This is a new comment with attachments',
      notifiedUserId: undefined,
      attachmentId: [1, 2],
    });
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(
      tool.handler({
        content: 'This should fail due to missing issue identifier',
      })
    ).rejects.toThrow(Error);
  });
});
