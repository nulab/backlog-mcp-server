import { updatePullRequestCommentTool } from './updatePullRequestComment.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('updatePullRequestCommentTool', () => {
  const mockBacklog: Partial<Backlog> = {
    patchPullRequestComments: vi.fn<() => Promise<any>>().mockResolvedValue({
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
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = updatePullRequestCommentTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns updated comment', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed
      number: 1,
      commentId: 1,
      content: 'Updated comment content',
    });

    expect(result).toHaveProperty('content', 'Updated comment content');
    expect(result).toHaveProperty('id', 1);
  });

  it('calls backlog.patchPullRequestComments with correct params when using repoName', async () => {
    const params = {
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed
      number: 1,
      commentId: 1,
      content: 'Updated comment content',
    };

    await tool.handler(params);

    expect(mockBacklog.patchPullRequestComments).toHaveBeenCalledWith(
      'TEST',
      'test-repo',
      1,
      1,
      {
        content: 'Updated comment content',
      }
    );
  });

  it('calls backlog.patchPullRequestComments with correct params when using projectId and repoName', async () => {
    const params = {
      projectId: 100,
      repoName: 'test-repo', // Changed
      number: 1,
      commentId: 1,
      content: 'Updated comment content via projectId',
    };

    await tool.handler(params);

    expect(mockBacklog.patchPullRequestComments).toHaveBeenCalledWith(
      100,
      'test-repo',
      1,
      1,
      {
        content: 'Updated comment content via projectId',
      }
    );
  });

  it('calls backlog.patchPullRequestComments with correct params when using projectId and repoId', async () => {
    const params = {
      projectId: 100,
      repoId: 200, // Added repoId
      number: 1,
      commentId: 1,
      content: 'Updated comment content via repoId',
    };

    await tool.handler(params);

    expect(mockBacklog.patchPullRequestComments).toHaveBeenCalledWith(
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
      // projectId and projectKey are missing
      repoName: 'test-repo', // Changed
      number: 1,
      commentId: 1,
      content: 'Test content',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });

  it('throws an error if neither repoId nor repoName is provided', async () => {
    const params = {
      projectKey: 'TEST',
      // repoId and repoName are missing
      number: 1,
      commentId: 1,
      content: 'Test content',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
