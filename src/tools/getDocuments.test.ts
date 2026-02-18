import { getDocumentsTool } from './getDocuments.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getDocumentsTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getDocuments: vi.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 1,
        projectId: 100,
        title: 'Test Document 1',
        content: 'This is a test document.',
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
        title: 'Test Document 2',
        content: 'This is another test document.',
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
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getDocumentsTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns a list of documents as formatted JSON text', async () => {
    const result = await tool.handler({ projectIds: [11], offset: 0 });
    if (!Array.isArray(result)) {
      throw new Error('Unexpected non-array result');
    }

    expect(result).toHaveLength(2);
    expect(result[0].title).toContain('Test Document 1');
  });

  it('calls backlog.getDocuments with correct params', async () => {
    await tool.handler({ projectIds: [11], offset: 0 });

    expect(mockBacklog.getDocuments).toHaveBeenCalledWith({
      projectId: [11],
      offset: 0,
    });
  });
});
