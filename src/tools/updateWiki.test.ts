import { updateWikiTool } from './updateWiki.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { patchWiki } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  patchWiki: vi.fn(),
}));

describe('updateWikiTool', () => {
  vi.mocked(patchWiki).mockResolvedValue({
    id: 1,
    projectId: 100,
    name: 'Updated Wiki Page',
    content: '# Updated Content\n\nThis wiki has been updated.',
    createdUser: {
      id: 1,
      userId: 'admin',
      name: 'Admin User',
      roleType: 1,
      lang: 'en',
      mailAddress: 'admin@example.com',
    },
    created: '2023-01-01T00:00:00Z',
    updatedUser: {
      id: 2,
      userId: 'editor',
      name: 'Editor User',
      roleType: 1,
      lang: 'en',
      mailAddress: 'editor@example.com',
    },
    updated: '2023-01-02T00:00:00Z',
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = updateWikiTool(mockClient, mockDescriptionHelper);

  it('returns updated wiki as formatted JSON text', async () => {
    const result = await tool.handler({
      wikiId: 1,
      name: 'Updated Wiki Page',
      content: '# Updated Content\n\nThis wiki has been updated.',
      mailNotify: false,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.name).toEqual('Updated Wiki Page');
    expect(result.content).toContain('Updated Content');
  });

  it('calls patchWiki with correct params when all parameters are provided', async () => {
    const params = {
      wikiId: 1,
      name: 'Updated Wiki Page',
      content: '# Updated Content\n\nThis wiki has been updated.',
      mailNotify: true,
    };

    await tool.handler(params);

    expect(patchWiki).toHaveBeenCalledWith(mockClient, 1, {
      name: 'Updated Wiki Page',
      content: '# Updated Content\n\nThis wiki has been updated.',
      mailNotify: true,
    });
  });

  it('calls patchWiki with only name parameter', async () => {
    const params = {
      wikiId: 1,
      name: 'New Name Only',
    };

    await tool.handler(params);

    expect(patchWiki).toHaveBeenCalledWith(mockClient, 1, {
      name: 'New Name Only',
      content: undefined,
      mailNotify: undefined,
    });
  });

  it('calls patchWiki with only content parameter', async () => {
    const params = {
      wikiId: 1,
      content: 'New content only',
    };

    await tool.handler(params);

    expect(patchWiki).toHaveBeenCalledWith(mockClient, 1, {
      name: undefined,
      content: 'New content only',
      mailNotify: undefined,
    });
  });

  it('handles wikiId as string (converts to number)', async () => {
    const params = {
      wikiId: '123',
      name: 'Updated Wiki',
    };

    await tool.handler(params);

    expect(patchWiki).toHaveBeenCalledWith(mockClient, 123, {
      name: 'Updated Wiki',
      content: undefined,
      mailNotify: undefined,
    });
  });

  it('handles wikiId as number', async () => {
    const params = {
      wikiId: 456,
      name: 'Updated Wiki',
    };

    await tool.handler(params);

    expect(patchWiki).toHaveBeenCalledWith(mockClient, 456, {
      name: 'Updated Wiki',
      content: undefined,
      mailNotify: undefined,
    });
  });

  it('includes mailNotify parameter when provided', async () => {
    const params = {
      wikiId: 1,
      content: 'Updated content',
      mailNotify: true,
    };

    await tool.handler(params);

    expect(patchWiki).toHaveBeenCalledWith(mockClient, 1, {
      name: undefined,
      content: 'Updated content',
      mailNotify: true,
    });
  });
});
