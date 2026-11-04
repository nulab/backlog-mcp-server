import { addPullRequestCommentTool } from './addPullRequestComment.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { postPullRequestComments } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  postPullRequestComments: vi.fn(),
}));

describe('addPullRequestCommentTool', () => {
  vi.mocked(postPullRequestComments).mockResolvedValue({
    id: 1,
    content: 'This looks good to me!',
    changeLog: [],
    createdUser: {
      id: 1,
      userId: 'user1',
      name: 'User One',
    },
    created: '2023-01-01T00:00:00Z',
    updated: '2023-01-01T00:00:00Z',
    stars: [],
    notifications: [],
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = addPullRequestCommentTool(mockClient, mockDescriptionHelper);

  it('returns created comment as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo',
      number: 1,
      content: 'This looks good to me!',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.content).toContain('This looks good to me!');
  });

  it('calls postPullRequestComments with correct params when using repoName', async () => {
    const params = {
      projectKey: 'TEST',
      repoName: 'test-repo',
      number: 1,
      content: 'This looks good to me!',
      notifiedUserId: [2, 3],
    };

    await tool.handler(params);

    expect(postPullRequestComments).toHaveBeenCalledWith(
      mockClient,
      'TEST',
      'test-repo',
      1,
      {
        content: 'This looks good to me!',
        notifiedUserId: [2, 3],
      }
    );
  });

  it('calls postPullRequestComments with correct params when using projectId and repoName', async () => {
    const params = {
      projectId: 100,
      repoName: 'test-repo',
      number: 1,
      content: 'Comment via projectId',
    };

    await tool.handler(params);

    expect(postPullRequestComments).toHaveBeenCalledWith(
      mockClient,
      100,
      'test-repo',
      1,
      {
        content: 'Comment via projectId',
        notifiedUserId: undefined,
      }
    );
  });

  it('calls postPullRequestComments with correct params when using projectId and repoId', async () => {
    const params = {
      projectId: 100,
      repoId: 200,
      number: 1,
      content: 'Comment via repoId',
    };

    await tool.handler(params);

    expect(postPullRequestComments).toHaveBeenCalledWith(
      mockClient,
      100,
      '200',
      1,
      {
        content: 'Comment via repoId',
        notifiedUserId: undefined,
      }
    );
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      repoName: 'test-repo',
      number: 1,
      content: 'Test content',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });

  it('throws an error if neither repoId nor repoName is provided', async () => {
    const params = {
      projectKey: 'TEST',
      number: 1,
      content: 'Test content',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
