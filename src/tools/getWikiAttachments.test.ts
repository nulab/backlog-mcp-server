import { getWikiAttachmentsTool } from './getWikiAttachments.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getWikiAttachmentsTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getWikisAttachments: vi.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 200,
        name: 'diagram.png',
        size: 8000,
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
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getWikiAttachmentsTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns wiki attachments', async () => {
    const result = await tool.handler({ wikiId: 10 });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('name', 'diagram.png');
  });

  it('calls backlog.getWikisAttachments with wiki ID', async () => {
    await tool.handler({ wikiId: 10 });
    expect(mockBacklog.getWikisAttachments).toHaveBeenCalledWith(10);
  });
});
