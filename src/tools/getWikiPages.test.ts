import { getWikiPagesTool } from './getWikiPages.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getWikis } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getWikis: vi.fn(),
}));

describe('getWikiPagesTool', () => {
  vi.mocked(getWikis).mockResolvedValue([
    {
      id: 1,
      projectId: 100,
      name: 'Getting Started',
      tags: ['guide', 'tutorial'],
      createdUser: {
        id: 1,
        userId: 'admin',
        name: 'Admin User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'admin@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      created: '2023-01-01T00:00:00Z',
      updatedUser: {
        id: 1,
        userId: 'admin',
        name: 'Admin User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'admin@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      updated: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      projectId: 100,
      name: 'API Documentation',
      tags: ['api', 'reference'],
      createdUser: {
        id: 1,
        userId: 'admin',
        name: 'Admin User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'admin@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      created: '2023-01-01T00:00:00Z',
      updatedUser: {
        id: 1,
        userId: 'admin',
        name: 'Admin User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'admin@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      updated: '2023-01-01T00:00:00Z',
    },
  ] as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getWikiPagesTool(mockClient, mockDescriptionHelper);

  it('returns wiki pages as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result).toHaveLength(2);
    expect(result[0].name).toContain('Getting Started');
    expect(result[1].name).toContain('API Documentation');
  });

  it('calls getWikis with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(getWikis).toHaveBeenCalledWith(mockClient, {
      projectIdOrKey: 'TEST', // This is correct as backlog-js expects projectIdOrKey
      keyword: undefined,
    });
  });

  it('calls getWikis with correct params when using project ID and keyword', async () => {
    await tool.handler({
      projectId: 100,
      keyword: 'api',
    });

    expect(getWikis).toHaveBeenCalledWith(mockClient, {
      projectIdOrKey: 100, // This is correct as backlog-js expects projectIdOrKey
      keyword: 'api',
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      // projectId and projectKey are missing
      keyword: 'test',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
