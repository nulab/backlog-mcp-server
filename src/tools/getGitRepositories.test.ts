import { getGitRepositoriesTool } from './getGitRepositories.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getGitRepositoriesTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getGitRepositories: jest.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 1,
        projectId: 100,
        name: 'test-repo',
        description: 'Test repository',
        hookUrl: 'https://example.com/hooks/test-repo',
        httpUrl: 'https://example.com/git/test-repo.git',
        sshUrl: 'git@example.com:test-repo.git',
        displayOrder: 0,
        pushedAt: '2023-01-01T00:00:00Z',
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
        name: 'another-repo',
        description: 'Another repository',
        hookUrl: 'https://example.com/hooks/another-repo',
        httpUrl: 'https://example.com/git/another-repo.git',
        sshUrl: 'git@example.com:another-repo.git',
        displayOrder: 1,
        pushedAt: '2023-01-02T00:00:00Z',
        createdUser: {
          id: 1,
          userId: 'user1',
          name: 'User One',
        },
        created: '2023-01-02T00:00:00Z',
        updatedUser: {
          id: 1,
          userId: 'user1',
          name: 'User One',
        },
        updated: '2023-01-02T00:00:00Z',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getGitRepositoriesTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns git repositories list as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result[0].name).toEqual('test-repo');
    expect(result[1].name).toEqual('another-repo');
  });

  it('calls backlog.getGitRepositories with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(mockBacklog.getGitRepositories).toHaveBeenCalledWith('TEST');
  });

  it('calls backlog.getGitRepositories with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
    });

    expect(mockBacklog.getGitRepositories).toHaveBeenCalledWith(100);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
