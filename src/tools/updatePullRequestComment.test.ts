import { updatePullRequestCommentTool } from './updatePullRequestComment.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { patchPullRequestComments } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  patchPullRequestComments: vi.fn(),
}));

describe('updatePullRequestCommentTool', () => {
  vi.mocked(patchPullRequestComments).mockResolvedValue({
    id: 1,
    content: 'Updated comment content',
    changeLog: [],
    createdUser: {
      id: 1,
      userId: 'user1',
      name: 'User One',
    },
    created: '2023-01-01T00:00:00Z',
    updated: '2023-01-02T00:00:00Z',
    stars: [],
    notifications: [],
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = updatePullRequestCommentTool(mockClient, mockDescriptionHelper);

  it('returns updated comment', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo',
      number: 1,
      commentId: 1,
      content: 'Updated comment content',
    });

    expect(result).toHaveProperty('content', 'Updated comment content');
    expect(result).toHaveProperty('id', 1);
  });

  it('calls patchPullRequestComments with correct params when using repoName', async () => {
    const params = {
      projectKey: 'TEST',
      repoName: 'test-repo',
      number: 1,
      commentId: 1,
      content: 'Updated comment content',
    };

    await tool.handler(params);

    expect(patchPullRequestComments).toHaveBeenCalledWith(
      mockClient,
      'TEST',
      'test-repo',
      1,
      1,
      {
        content: 'Updated comment content',
      }
    );
  });

  it('calls patchPullRequestComments with correct params when using projectId and repoName', async () => {
    const params = {
      projectId: 100,
      repoName: 'test-repo',
      number: 1,
      commentId: 1,
      content: 'Updated comment content via projectId',
    };

    await tool.handler(params);

    expect(patchPullRequestComments).toHaveBeenCalledWith(
      mockClient,
      100,
      'test-repo',
      1,
      1,
      {
        content: 'Updated comment content via projectId',
      }
    );
  });

  it('calls patchPullRequestComments with correct params when using projectId and repoId', async () => {
    const params = {
      projectId: 100,
      repoId: 200,
      number: 1,
      commentId: 1,
      content: 'Updated comment content via repoId',
    };

    await tool.handler(params);

    expect(patchPullRequestComments).toHaveBeenCalledWith(
      mockClient,
      100,
      '200',
      1,
      1,
      {
        content: 'Updated comment content via repoId',
      }
    );
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      repoName: 'test-repo',
      number: 1,
      commentId: 1,
      content: 'Test content',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });

  it('throws an error if neither repoId nor repoName is provided', async () => {
    const params = {
      projectKey: 'TEST',
      number: 1,
      commentId: 1,
      content: 'Test content',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
