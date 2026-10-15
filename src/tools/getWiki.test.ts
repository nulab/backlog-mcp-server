import { getWikiTool } from './getWiki.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getWiki } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getWiki: vi.fn(),
}));

describe('getWikiTool', () => {
  vi.mocked(getWiki).mockResolvedValue({
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
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getWikiTool(mockClient, mockDescriptionHelper);

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

  it('calls getWiki with correct params when using number ID', async () => {
    await tool.handler({
      wikiId: 1234,
    });

    expect(getWiki).toHaveBeenCalledWith(mockClient, 1234);
  });

  it('calls getWiki with correct params when using string ID', async () => {
    await tool.handler({
      wikiId: '1234',
    });

    expect(getWiki).toHaveBeenCalledWith(mockClient, 1234);
  });
});
