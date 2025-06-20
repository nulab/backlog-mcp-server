import { getGitRepositoryTool } from './getGitRepository.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getGitRepositoryTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getGitRepository: jest.fn<() => Promise<any>>().mockResolvedValue({
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
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getGitRepositoryTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns git repository information as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.name).toContain('test-repo');
    expect(result.description).toContain('Test repository');
  });

  it('calls backlog.getGitRepository with correct params when using project key and repoName', async () => {
    await tool.handler({
      projectKey: 'TEST',
      repoName: 'test-repo', // Changed
    });

    expect(mockBacklog.getGitRepository).toHaveBeenCalledWith(
      'TEST',
      'test-repo'
    );
  });

  it('calls backlog.getGitRepository with correct params when using projectId and repoName', async () => {
    await tool.handler({
      projectId: 100,
      repoName: 'test-repo', // Changed
    });

    expect(mockBacklog.getGitRepository).toHaveBeenCalledWith(100, 'test-repo');
  });

  it('calls backlog.getGitRepository with correct params when using projectId and repoId', async () => {
    await tool.handler({
      projectId: 100,
      repoId: 200, // Added repoId
    });

    expect(mockBacklog.getGitRepository).toHaveBeenCalledWith(100, '200');
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
