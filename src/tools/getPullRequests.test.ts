import { getPullRequestsTool } from './getPullRequests.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getPullRequestsTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getPullRequests: vi.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 1,
        projectId: 100,
        repositoryId: 200,
        number: 1,
        summary: 'Fix bug in login',
        description: 'This PR fixes a bug in the login process',
        base: 'main',
        branch: 'fix/login-bug',
        status: {
          id: 1,
          name: 'Open',
        },
        assignee: {
          id: 1,
          userId: 'user1',
          name: 'User One',
        },
        issue: {
          id: 1000,
          issueKey: 'TEST-1',
          summary: 'Login bug',
        },
        baseCommit: 'abc123',
        branchCommit: 'def456',
        closeAt: null,
        mergeAt: null,
        createdUser: {
          id: 1,
          userId: 'user1',
          name: 'User One',
        },
        created: '2023-01-01T00:00:00Z',
        updatedUser: {
          id: 1,
          userId: 'user1',
          name: 'User One',
        },
        updated: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        projectId: 100,
        repositoryId: 200,
        number: 2,
        summary: 'Add new feature',
        description: 'This PR adds a new feature',
        base: 'main',
        branch: 'feature/new-feature',
        status: {
          id: 1,
          name: 'Open',
        },
        assignee: {
          id: 2,
          userId: 'user2',
          name: 'User Two',
        },
        issue: {
          id: 1001,
          issueKey: 'TEST-2',
          summary: 'New feature',
        },
        baseCommit: 'ghi789',
        branchCommit: 'jkl012',
        closeAt: null,
        mergeAt: null,
        createdUser: {
          id: 2,
          userId: 'user2',
          name: 'User Two',
        },
        created: '2023-01-02T00:00:00Z',
        updatedUser: {
          id: 2,
          userId: 'user2',
          name: 'User Two',
        },
        updated: '2023-01-02T00:00:00Z',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getPullRequestsTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns pull requests list as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo',
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result).toHaveLength(2);
    expect(result[0].summary).toEqual('Fix bug in login');
    expect(result[1].summary).toEqual('Add new feature');
  });

  it('calls backlog.getPullRequests with correct params when using repoName', async () => {
    const params = {
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed
      statusId: [1, 2],
      assigneeId: [1],
      count: 20,
    };

    await tool.handler(params);

    expect(mockBacklog.getPullRequests).toHaveBeenCalledWith(
      'TEST',
      'test-repo',
      {
        statusId: [1, 2],
        assigneeId: [1],
        count: 20,
      }
    );
  });

  it('calls backlog.getPullRequests with correct params when using projectId and repoName', async () => {
    const params = {
      projectId: 100,
      repoName: 'test-repo', // Changed
      statusId: [1],
    };

    await tool.handler(params);

    expect(mockBacklog.getPullRequests).toHaveBeenCalledWith(100, 'test-repo', {
      statusId: [1],
      assigneeId: undefined,
      count: undefined,
      createdUserId: undefined,
      issueId: undefined,
      offset: undefined,
    });
  });

  it('calls backlog.getPullRequests with correct params when using projectId and repoId', async () => {
    const params = {
      projectId: 100,
      repoId: 200, // Added repoId
      statusId: [1],
    };

    await tool.handler(params);

    expect(mockBacklog.getPullRequests).toHaveBeenCalledWith(100, '200', {
      statusId: [1],
      assigneeId: undefined,
      count: undefined,
      createdUserId: undefined,
      issueId: undefined,
      offset: undefined,
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      // projectId and projectKey are missing
      repoName: 'test-repo',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });

  it('throws an error if neither repoId nor repoName is provided', async () => {
    const params = {
      projectKey: 'TEST',
      // repoId and repoName are missing
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
