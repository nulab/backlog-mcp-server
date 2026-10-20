import { getGitRepositoryTool } from './getGitRepository.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getGitRepository } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getGitRepository: vi.fn(),
}));

describe('getGitRepositoryTool', () => {
  vi.mocked(getGitRepository).mockResolvedValue({
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
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getGitRepositoryTool(mockClient, mockDescriptionHelper);

  it('returns git repository information as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.name).toContain('test-repo');
    expect(result.description).toContain('Test repository');
  });

  it('calls getGitRepository with correct params when using project key and repoName', async () => {
    await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo',
    });

    expect(getGitRepository).toHaveBeenCalledWith(
      mockClient,
      'TEST',
      'test-repo'
    );
  });

  it('calls getGitRepository with correct params when using projectId and repoName', async () => {
    await tool.handler({
      projectId: 100,
      repoName: 'test-repo',
    });

    expect(getGitRepository).toHaveBeenCalledWith(mockClient, 100, 'test-repo');
  });

  it('calls getGitRepository with correct params when using projectId and repoId', async () => {
    await tool.handler({
      projectId: 100,
      repoId: 200,
    });

    expect(getGitRepository).toHaveBeenCalledWith(mockClient, 100, '200');
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
