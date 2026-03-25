import { deleteDocumentTool } from './deleteDocument.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('deleteDocumentTool', () => {
  const mockBacklog: Partial<Backlog> = {
    deleteDocument: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: '019347fc760c7b0abff04b44628c94d7',
      projectId: 1,
      title: 'Test Document',
      plain: 'This is a test document.',
      json: '{}',
      statusId: 1,
      emoji: null,
      attachments: [],
      tags: [],
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
  const tool = deleteDocumentTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns deleted document as formatted JSON text', async () => {
    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
    });
    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.title).toContain('Test Document');
    expect(result.id).toBe('019347fc760c7b0abff04b44628c94d7');
  });

  it('calls backlog.deleteDocument with correct params', async () => {
    await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
    });

    expect(mockBacklog.deleteDocument).toHaveBeenCalledWith(
      '019347fc760c7b0abff04b44628c94d7'
    );
  });
});
