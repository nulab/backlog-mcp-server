import { getPullRequestsCountTool } from './getPullRequestsCount.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getPullRequestsCount } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getPullRequestsCount: vi.fn(),
}));

describe('getPullRequestsCountTool', () => {
  vi.mocked(getPullRequestsCount).mockResolvedValue({
    count: 42,
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getPullRequestsCountTool(mockClient, mockDescriptionHelper);

  it('returns pull requests count', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo',
    });

    expect(result).toHaveProperty('count', 42);
  });

  it('calls getPullRequestsCount with correct params when using repoName', async () => {
    const params = {
      projectKey: 'TEST',
      repoName: 'test-repo',
      statusId: [1, 2],
      assigneeId: [1],
    };

    await tool.handler(params);

    expect(getPullRequestsCount).toHaveBeenCalledWith(
      mockClient,
      'TEST',
      'test-repo',
      {
        statusId: [1, 2],
        assigneeId: [1],
      }
    );
  });

  it('calls getPullRequestsCount with correct params when using projectId and repoName', async () => {
    const params = {
      projectId: 100,
      repoName: 'test-repo',
      statusId: [1],
    };

    await tool.handler(params);

    expect(getPullRequestsCount).toHaveBeenCalledWith(
      mockClient,
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

  it('calls getPullRequestsCount with correct params when using projectId and repoId', async () => {
    const params = {
      projectId: 100,
      repoId: 200,
      statusId: [1],
    };

    await tool.handler(params);

    expect(getPullRequestsCount).toHaveBeenCalledWith(mockClient, 100, '200', {
      statusId: [1],
      assigneeId: undefined,
      createdUserId: undefined,
      issueId: undefined,
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      repoName: 'test-repo',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });

  it('throws an error if neither repoId nor repoName is provided', async () => {
    const params = {
      projectKey: 'TEST',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
