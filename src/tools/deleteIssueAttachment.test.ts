import { deleteIssueAttachmentTool } from './deleteIssueAttachment.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('deleteIssueAttachmentTool', () => {
  const mockBacklog: Partial<Backlog> = {
    deleteIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 200,
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
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = deleteIssueAttachmentTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns deleted attachment info', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 200,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.id).toBe(200);
    expect(result.name).toBe('screenshot.png');
  });

  it('calls backlog.deleteIssueAttachment with issue key and attachment ID as string', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 200,
    });

    expect(mockBacklog.deleteIssueAttachment).toHaveBeenCalledWith(
      'TEST-1',
      '200'
    );
  });

  it('calls backlog.deleteIssueAttachment with issue ID', async () => {
    await tool.handler({
      issueId: 10,
      attachmentId: 200,
    });

    expect(mockBacklog.deleteIssueAttachment).toHaveBeenCalledWith(10, '200');
  });

  it('throws if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({ attachmentId: 200 } as any)).rejects.toThrow(
      Error
    );
  });
});
