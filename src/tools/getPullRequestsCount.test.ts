import { getPullRequestsCountTool } from './getPullRequestsCount.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getPullRequestsCountTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getPullRequestsCount: jest.fn<() => Promise<any>>().mockResolvedValue({
      count: 42,
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getPullRequestsCountTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns pull requests count', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed
    });

    expect(result).toHaveProperty('count', 42);
  });

  it('calls backlog.getPullRequestsCount with correct params when using repoName', async () => {
    const params = {
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed
      statusId: [1, 2],
      assigneeId: [1],
    };

    await tool.handler(params);

    expect(mockBacklog.getPullRequestsCount).toHaveBeenCalledWith(
      'TEST',
      'test-repo',
      {
        statusId: [1, 2],
        assigneeId: [1],
      }
    );
  });

  it('calls backlog.getPullRequestsCount with correct params when using projectId and repoName', async () => {
    const params = {
      projectId: 100,
      repoName: 'test-repo', // Changed
      statusId: [1],
    };

    await tool.handler(params);

    expect(mockBacklog.getPullRequestsCount).toHaveBeenCalledWith(
      100,
      'test-repo',
      {
        statusId: [1],
        assigneeId: undefined,
        createdUserId: undefined,
        issueId: undefined,
      }
    );
  });

  it('calls backlog.getPullRequestsCount with correct params when using projectId and repoId', async () => {
    const params = {
      projectId: 100,
      repoId: 200, // Added repoId
      statusId: [1],
    };

    await tool.handler(params);

    expect(mockBacklog.getPullRequestsCount).toHaveBeenCalledWith(100, '200', {
      statusId: [1],
      assigneeId: undefined,
      createdUserId: undefined,
      issueId: undefined,
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      // projectId and projectKey are missing
      repoName: 'test-repo', // Changed
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
