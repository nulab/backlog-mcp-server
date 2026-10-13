import { getDocumentTool } from './getDocument.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import type { Backlog } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

describe('getDocumentTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getDocument: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: '019347fc760c7b0abff04b44628c94d7',
      projectId: 1,
      title: 'Test Document',
      plain: 'This is a test document.',
      json: { type: 'doc', content: [] },
      statusId: 1,
      emoji: null,
      attachments: [
        {
          id: 22067,
          name: 'test.png',
          size: 8718,
          createdUser: {
            id: 3,
            userId: 'woody',
            name: 'woody',
            roleType: 2,
            lang: 'ja',
            mailAddress: 'woody@nulab.com',
            nulabAccount: {
              nulabId: 'aaa',
              name: 'woody',
              uniqueId: 'woody',
              iconUrl: 'https://photo',
            },
            keyword: 'woody',
            lastLoginTime: '2025-05-22T23:04:03Z',
          },
          created: '2025-05-29T02:19:54Z',
        },
      ],
      tags: [
        {
          id: 1,
          name: 'Backlog',
        },
      ],
      createdUser: {
        id: 2,
        userId: 'woody',
        name: 'woody',
        roleType: 1,
        lang: 'en',
        mailAddress: 'woody@nulab.com',
        nulabAccount: null,
        keyword: 'Woody',
        lastLoginTime: '2025-05-28T22:24:36Z',
      },
      created: '2024-12-06T01:08:56Z',
      updatedUser: {
        id: 2,
        userId: 'woody',
        name: 'woody',
        roleType: 1,
        lang: 'en',
        mailAddress: 'woody@nulab.com',
        nulabAccount: null,
        keyword: 'Woody',
        lastLoginTime: '2025-05-28T22:24:36Z',
      },
      updated: '2025-04-28T01:47:02Z',
    }),
  };

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getDocumentTool(mockBacklog as Backlog, mockDescriptionHelper);

  it('returns document as formatted JSON text', async () => {
    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
    });
    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.title).toContain('Test Document');
    expect(result.plain).toContain('This is a test document.');
  });

  it('does not return the ProseMirror json', async () => {
    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
    });

    expect(result).not.toHaveProperty('json');
  });

  it('returns the whole of plain when it fits in the limit', async () => {
    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
    });

    expect(result).toMatchObject({
      plain: 'This is a test document.',
      plainLength: 24,
    });
    expect(result).not.toHaveProperty('nextStart');
  });

  it('returns a slice of plain and where the next one starts', async () => {
    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
      start: 5,
      limit: 7,
    });

    expect(result).toMatchObject({
      plain: 'is a te',
      plainLength: 24,
      nextStart: 12,
    });
  });

  it('omits nextStart on the last slice', async () => {
    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
      start: 12,
      limit: 12,
    });

    expect(result).toMatchObject({ plain: 'st document.', plainLength: 24 });
    expect(result).not.toHaveProperty('nextStart');
  });

  it('returns empty plain when start is past the end', async () => {
    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
      start: 100,
    });

    expect(result).toMatchObject({ plain: '', plainLength: 24 });
    expect(result).not.toHaveProperty('nextStart');
  });

  it('returns the first DEFAULT_LIMIT characters when limit is not given', async () => {
    vi.mocked(mockBacklog.getDocument!).mockResolvedValueOnce({
      id: '019347fc760c7b0abff04b44628c94d7',
      plain: 'a'.repeat(40_000) + 'b'.repeat(10),
    } as any);

    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
    });

    expect(result).toMatchObject({
      plain: 'a'.repeat(40_000),
      plainLength: 40_010,
      nextStart: 40_000,
    });
  });

  it('puts plain after nextStart so a truncated response keeps it', async () => {
    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
      limit: 7,
    });

    const keys = Object.keys(result);
    expect(keys.at(-1)).toBe('plain');
    expect(keys.indexOf('nextStart')).toBeLessThan(keys.indexOf('plain'));
  });

  it('treats a missing plain as empty', async () => {
    vi.mocked(mockBacklog.getDocument!).mockResolvedValueOnce({
      id: '019347fc760c7b0abff04b44628c94d7',
      plain: null,
    } as any);

    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
    });

    expect(result).toMatchObject({ plain: '', plainLength: 0 });
    expect(result).not.toHaveProperty('nextStart');
  });

  it('calls backlog.getDocument with correct params', async () => {
    await tool.handler({ documentId: '019347fc760c7b0abff04b44628c94d7' });

    expect(mockBacklog.getDocument).toHaveBeenCalledWith(
      '019347fc760c7b0abff04b44628c94d7'
    );
  });
});
