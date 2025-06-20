import { getWatchingListItemsTool } from './getWatchingListItems.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getWatchingListItemsTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getWatchingListItems: jest.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 1,
        resourceAlreadyRead: false,
        note: 'Important issue',
        type: 'issue',
        issue: {
          id: 1000,
          projectId: 100,
          issueKey: 'TEST-1',
          summary: 'Test issue',
        },
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        resourceAlreadyRead: true,
        note: 'Important wiki',
        type: 'wiki',
        wiki: {
          id: 2000,
          projectId: 100,
          name: 'Test wiki',
          content: 'Wiki content',
        },
        created: '2023-01-02T00:00:00Z',
        updated: '2023-01-02T00:00:00Z',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getWatchingListItemsTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns watching list items as formatted JSON text', async () => {
    const result = await tool.handler({
      userId: 1,
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result).toHaveLength(2);
    expect(result[0].note).toContain('Important issue');
    expect(result[1].note).toContain('Important wiki');
  });

  it('calls backlog.getWatchingListItems with correct params', async () => {
    await tool.handler({
      userId: 1,
    });

    expect(mockBacklog.getWatchingListItems).toHaveBeenCalledWith(1);
  });
});
