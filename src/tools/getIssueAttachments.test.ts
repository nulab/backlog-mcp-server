import { getIssueAttachmentsTool } from './getIssueAttachments.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getIssueAttachmentsTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getIssueAttachments: vi.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 100,
        name: 'screenshot.png',
        size: 12345,
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
      {
        id: 101,
        name: 'document.pdf',
        size: 54321,
        createdUser: {
          id: 2,
          userId: 'user',
          name: 'Test User',
          roleType: 2,
          lang: 'en',
          mailAddress: 'test@example.com',
          lastLoginTime: '2023-01-01T00:00:00Z',
        },
        created: '2023-01-02T00:00:00Z',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getIssueAttachmentsTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns issue attachments', async () => {
    const result = await tool.handler({ issueKey: 'TEST-1' });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('name', 'screenshot.png');
    expect(result[1]).toHaveProperty('name', 'document.pdf');
  });

  it('calls backlog.getIssueAttachments with issue key', async () => {
    await tool.handler({ issueKey: 'TEST-1' });
    expect(mockBacklog.getIssueAttachments).toHaveBeenCalledWith('TEST-1');
  });

  it('calls backlog.getIssueAttachments with issue ID', async () => {
    await tool.handler({ issueId: 42 });
    expect(mockBacklog.getIssueAttachments).toHaveBeenCalledWith(42);
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });
});
