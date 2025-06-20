import { getPullRequestTool } from './getPullRequest.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getPullRequestTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getPullRequest: jest.fn<() => Promise<any>>().mockResolvedValue({
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
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getPullRequestTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns pull request information as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed from repoIdOrName
      number: 1,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.summary).toContain('Fix bug in login');
    expect(result.description).toContain(
      'This PR fixes a bug in the login process'
    );
  });

  it('calls backlog.getPullRequest with correct params when using repoName', async () => {
    await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed from repoIdOrName
      number: 1,
    });

    expect(mockBacklog.getPullRequest).toHaveBeenCalledWith(
      'TEST',
      'test-repo',
      1
    );
  });

  it('calls backlog.getPullRequest with correct params when using projectId and repoName', async () => {
    await tool.handler({
      projectId: 100,
      repoName: 'test-repo', // Changed from repoIdOrName
      number: 1,
    });

    expect(mockBacklog.getPullRequest).toHaveBeenCalledWith(
      100,
      'test-repo',
      1
    );
  });

  it('calls backlog.getPullRequest with correct params when using projectId and repoId', async () => {
    await tool.handler({
      projectId: 100,
      repoId: 200, // Added repoId
      number: 1,
    });

    expect(mockBacklog.getPullRequest).toHaveBeenCalledWith(100, '200', 1);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      // projectId and projectKey are missing
      repoName: 'test-repo',
      number: 1,
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });

  it('throws an error if neither repoId nor repoName is provided', async () => {
    const params = {
      projectKey: 'TEST',
      // repoId and repoName are missing
      number: 1,
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
