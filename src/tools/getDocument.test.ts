import { getDocumentTool } from './getDocument.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import type { Backlog } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';
import { composeToolHandler } from '../handlers/builders/composeToolHandler.js';
import { countTokens } from '../utils/tokenCounter.js';

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

  describe('with the token limit', () => {
    const documentWith = (plain: string) =>
      vi.mocked(mockBacklog.getDocument!).mockResolvedValueOnce({
        id: 'doc',
        title: 'Doc',
        plain,
      } as any);

    it('shortens the slice so the response fits in maxTokens', async () => {
      // Markdown table rows: every `|` and escaped newline costs a token, so
      // far fewer characters fit than the limit allows.
      documentWith('| a | b |\n'.repeat(1000));

      const result = (await tool.handler(
        { documentId: 'doc' },
        { maxTokens: 1000 }
      )) as any;

      expect(countTokens(JSON.stringify(result))).toBeLessThanOrEqual(1000);
      expect(result.plain.length).toBeGreaterThan(0);
      expect(result.nextStart).toBe(result.plain.length);
    });

    it('leaves a slice that already fits as asked', async () => {
      documentWith('x'.repeat(100));

      const result = await tool.handler(
        { documentId: 'doc', limit: 30 },
        { maxTokens: 1000 }
      );

      expect(result).toMatchObject({ plain: 'x'.repeat(30), nextStart: 30 });
    });

    it('returns at least one character even when nothing fits', async () => {
      documentWith('abc');

      const result = await tool.handler(
        { documentId: 'doc' },
        { maxTokens: 1 }
      );

      expect(result).toMatchObject({ plain: 'a', nextStart: 1 });
    });

    it('is applied by composeToolHandler, so nothing is cut after it', async () => {
      documentWith('| a | b |\n'.repeat(1000));
      const { handler } = composeToolHandler(tool, {
        useFields: false,
        maxTokens: 1000,
      });

      const result = await handler({ documentId: 'doc' }, {} as never);
      const text = (result.content[0] as { text: string }).text;

      expect(text).not.toContain('output truncated');
      expect(JSON.parse(text).nextStart).toBeGreaterThan(0);
    });
  });

  describe('surrogate pairs', () => {
    // '😀' is two UTF-16 code units, at indices 2 and 3.
    const text = 'ab😀cd';

    it('does not end a slice inside a surrogate pair', async () => {
      vi.mocked(mockBacklog.getDocument!).mockResolvedValueOnce({
        id: 'doc',
        plain: text,
      } as any);

      const result = await tool.handler({ documentId: 'doc', limit: 3 });

      expect(result).toMatchObject({ plain: 'ab', nextStart: 2 });
    });

    it('does not start a slice inside a surrogate pair', async () => {
      vi.mocked(mockBacklog.getDocument!).mockResolvedValueOnce({
        id: 'doc',
        plain: text,
      } as any);

      const result = await tool.handler({ documentId: 'doc', start: 3 });

      expect(result).toMatchObject({ plain: '😀cd' });
    });

    it('returns a whole surrogate pair when only it is left to make progress', async () => {
      vi.mocked(mockBacklog.getDocument!).mockResolvedValueOnce({
        id: 'doc',
        plain: text,
      } as any);

      const result = await tool.handler(
        { documentId: 'doc', start: 2 },
        { maxTokens: 1 }
      );

      expect(result).toMatchObject({ plain: '😀', nextStart: 4 });
    });
  });
});
