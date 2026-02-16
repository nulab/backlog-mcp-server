import { updateWikiTool } from './updateWiki.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('updateWikiTool', () => {
  const mockBacklog: Partial<Backlog> = {
    patchWiki: vi.fn<() => Promise<any>>().mockResolvedValue({
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
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = updateWikiTool(mockBacklog as Backlog, mockTranslationHelper);

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

  it('calls backlog.patchWiki with correct params when all parameters are provided', async () => {
    const params = {
      wikiId: 1,
      name: 'Updated Wiki Page',
      content: '# Updated Content\n\nThis wiki has been updated.',
      mailNotify: true,
    };

    await tool.handler(params);

    expect(mockBacklog.patchWiki).toHaveBeenCalledWith(1, {
      name: 'Updated Wiki Page',
      content: '# Updated Content\n\nThis wiki has been updated.',
      mailNotify: true,
    });
  });

  it('calls backlog.patchWiki with only name parameter', async () => {
    const params = {
      wikiId: 1,
      name: 'New Name Only',
    };

    await tool.handler(params);

    expect(mockBacklog.patchWiki).toHaveBeenCalledWith(1, {
      name: 'New Name Only',
      content: undefined,
      mailNotify: undefined,
    });
  });

  it('calls backlog.patchWiki with only content parameter', async () => {
    const params = {
      wikiId: 1,
      content: 'New content only',
    };

    await tool.handler(params);

    expect(mockBacklog.patchWiki).toHaveBeenCalledWith(1, {
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

    expect(mockBacklog.patchWiki).toHaveBeenCalledWith(123, {
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

    expect(mockBacklog.patchWiki).toHaveBeenCalledWith(456, {
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

    expect(mockBacklog.patchWiki).toHaveBeenCalledWith(1, {
      name: undefined,
      content: 'Updated content',
      mailNotify: true,
    });
  });
});
