import { getDocumentCommentsTool } from './getDocumentComments.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getDocumentComments } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getDocumentComments: vi.fn(),
}));

describe('getDocumentCommentsTool', () => {
  const createdUser = {
    id: 1,
    userId: 'admin',
    name: 'admin',
    roleType: 1,
    lang: 'ja',
    mailAddress: 'admin@example.com',
    nulabAccount: null,
    keyword: 'admin',
    lastLoginTime: '2025-05-28T22:24:36Z',
  };

  vi.mocked(getDocumentComments).mockResolvedValue([
    {
      id: '0199a1b2c3d4e5f60718293a4b5c6d7e',
      documentId: '019347fc760c7b0abff04b44628c94d7',
      statusId: 1,
      content: '{"type":"doc","content":[]}',
      plain: 'First comment',
      commentType: 'comment',
      createdUserId: 1,
      created: '2025-06-01T00:00:00Z',
      updatedUserId: 1,
      updated: '2025-06-01T00:00:00Z',
      createdUser,
      replies: [
        {
          id: '0199a1b2c3d4e5f60718293a4b5c6d7f',
          documentId: '019347fc760c7b0abff04b44628c94d7',
          commentId: '0199a1b2c3d4e5f60718293a4b5c6d7e',
          content: '{"type":"doc","content":[]}',
          plain: 'A reply',
          createdUserId: 1,
          created: '2025-06-02T00:00:00Z',
          updatedUserId: 1,
          updated: '2025-06-02T00:00:00Z',
          createdUser,
        },
      ],
    },
  ] as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getDocumentCommentsTool(mockClient, mockDescriptionHelper);

  it('returns comments with replies', async () => {
    const result = await tool.handler({
      documentId: '019347fc760c7b0abff04b44628c94d7',
    });
    if (!Array.isArray(result)) {
      throw new Error('Expected array result');
    }

    expect(result).toHaveLength(1);
    expect(result[0].plain).toBe('First comment');
    expect(result[0].replies[0].plain).toBe('A reply');
  });

  it('calls getDocumentComments with correct params', async () => {
    await tool.handler({ documentId: '019347fc760c7b0abff04b44628c94d7' });

    expect(getDocumentComments).toHaveBeenCalledWith(
      mockClient,
      '019347fc760c7b0abff04b44628c94d7'
    );
  });
});
