import { updatePullRequestTool } from './updatePullRequest.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('updatePullRequestTool', () => {
  const mockBacklog: Partial<Backlog> = {
    patchPullRequest: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      projectId: 100,
      repositoryId: 200,
      number: 1,
      summary: 'Updated PR title',
      description: 'Updated PR description',
      base: 'main',
      branch: 'fix/login-bug',
      status: {
        id: 2,
        name: 'Closed',
      },
      assignee: {
        id: 2,
        userId: 'user2',
        name: 'User Two',
      },
      issue: {
        id: 1001,
        issueKey: 'TEST-2',
        summary: 'Another issue',
      },
      baseCommit: 'abc123',
      branchCommit: 'def456',
      closeAt: '2023-01-02T00:00:00Z',
      mergeAt: '2023-01-02T00:00:00Z',
      createdUser: {
        id: 1,
        userId: 'user1',
        name: 'User One',
      },
      created: '2023-01-01T00:00:00Z',
      updatedUser: {
        id: 2,
        userId: 'user2',
        name: 'User Two',
      },
      updated: '2023-01-02T00:00:00Z',
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = updatePullRequestTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns updated pull request', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed
      number: 1,
      summary: 'Updated PR title',
      description: 'Updated PR description',
      statusId: 2,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result).toHaveProperty('summary', 'Updated PR title');
    expect(result).toHaveProperty('description', 'Updated PR description');
    expect(result.status).toHaveProperty('name', 'Closed');
  });

  it('calls backlog.patchPullRequest with correct params when using repoName', async () => {
    const params = {
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed
      number: 1,
      summary: 'Updated PR title',
      description: 'Updated PR description',
      issueId: 1001,
      assigneeId: 2,
      statusId: 2,
    };

    await tool.handler(params);

    expect(mockBacklog.patchPullRequest).toHaveBeenCalledWith(
      'TEST',
      'test-repo',
      1,
      {
        summary: 'Updated PR title',
        description: 'Updated PR description',
        issueId: 1001,
        assigneeId: 2,
        statusId: 2,
      }
    );
  });

  it('calls backlog.patchPullRequest with correct params when using projectId and repoName', async () => {
    const params = {
      projectId: 100,
      repoName: 'test-repo', // Changed
      number: 1,
      summary: 'Updated PR title via projectId',
    };

    await tool.handler(params);

    expect(mockBacklog.patchPullRequest).toHaveBeenCalledWith(
      100,
      'test-repo',
      1,
      {
        summary: 'Updated PR title via projectId',
        description: undefined,
        issueId: undefined,
        assigneeId: undefined,
        statusId: undefined,
        notifiedUserId: undefined,
      }
    );
  });

  it('calls backlog.patchPullRequest with correct params when using projectId and repoId', async () => {
    const params = {
      projectId: 100,
      repoId: 200, // Added repoId
      number: 1,
      summary: 'Updated PR title via repoId',
    };

    await tool.handler(params);

    expect(mockBacklog.patchPullRequest).toHaveBeenCalledWith(100, '200', 1, {
      summary: 'Updated PR title via repoId',
      description: undefined,
      issueId: undefined,
      assigneeId: undefined,
      statusId: undefined,
      notifiedUserId: undefined,
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      // projectId and projectKey are missing
      repoName: 'test-repo', // Changed
      number: 1,
      summary: 'Test Summary',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });

  it('throws an error if neither repoId nor repoName is provided', async () => {
    const params = {
      projectKey: 'TEST',
      // repoId and repoName are missing
      number: 1,
      summary: 'Test Summary',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
