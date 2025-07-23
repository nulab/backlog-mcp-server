import { getDocumentTool } from './getDocument.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getDocumentTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getDocument: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: '019347fc760c7b0abff04b44628c94d7',
      projectId: 1,
      title: 'Test Document',
      plain: 'This is a test document.',
      json: '{}',
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

  const mockTranslationHelper = createTranslationHelper();
  const tool = getDocumentTool(mockBacklog as Backlog, mockTranslationHelper);

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

  it('calls backlog.getDocument with correct params', async () => {
    await tool.handler({ documentId: '019347fc760c7b0abff04b44628c94d7' });

    expect(mockBacklog.getDocument).toHaveBeenCalledWith(
      '019347fc760c7b0abff04b44628c94d7'
    );
  });
});
