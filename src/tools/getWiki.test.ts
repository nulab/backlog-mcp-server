import { getWikiTool } from './getWiki.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getWikiTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getWiki: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: 1234,
      projectId: 100,
      name: 'Sample Wiki',
      content: '# Sample Wiki Content\n\nThis is a sample wiki page.',
      tags: [
        { id: 1, name: 'documentation' },
        { id: 2, name: 'guide' },
      ],
      attachments: [],
      sharedFiles: [],
      stars: [],
      createdUser: {
        id: 1,
        userId: 'user1',
        name: 'User One',
      },
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-02T00:00:00Z',
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getWikiTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns wiki information as formatted JSON text', async () => {
    const result = await tool.handler({
      wikiId: 1234,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.name).toEqual('Sample Wiki');
    expect(result.content).toContain('Sample Wiki Content');
  });

  it('calls backlog.getWiki with correct params when using number ID', async () => {
    await tool.handler({
      wikiId: 1234,
    });

    expect(mockBacklog.getWiki).toHaveBeenCalledWith(1234);
  });

  it('calls backlog.getWiki with correct params when using string ID', async () => {
    await tool.handler({
      wikiId: '1234',
    });

    expect(mockBacklog.getWiki).toHaveBeenCalledWith(1234);
  });
});
