import { getGitRepositoriesTool } from './getGitRepositories.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getGitRepositories } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getGitRepositories: vi.fn(),
}));

describe('getGitRepositoriesTool', () => {
  vi.mocked(getGitRepositories).mockResolvedValue([
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
  ] as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getGitRepositoriesTool(mockClient, mockDescriptionHelper);

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

  it('calls getGitRepositories with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(getGitRepositories).toHaveBeenCalledWith(mockClient, 'TEST');
  });

  it('calls getGitRepositories with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
    });

    expect(getGitRepositories).toHaveBeenCalledWith(mockClient, 100);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
