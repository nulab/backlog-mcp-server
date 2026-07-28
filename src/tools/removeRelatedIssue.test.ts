import { removeRelatedIssueTool } from './removeRelatedIssue.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('removeRelatedIssueTool', () => {
  const mockBacklog: Partial<Backlog> = {
    removeRelatedIssue: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 2,
      projectId: 100,
      issueKey: 'TEST-2',
      keyId: 2,
      summary: 'Related Issue',
      type: 'RELATES',
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = removeRelatedIssueTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns the unlinked issue', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
      relatedIssueId: 2,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.issueKey).toEqual('TEST-2');
  });

  it('calls backlog.removeRelatedIssue with the issue key and related issue ID', async () => {
    await tool.handler({ issueKey: 'TEST-1', relatedIssueId: 2 });

    expect(mockBacklog.removeRelatedIssue).toHaveBeenCalledWith('TEST-1', 2);
  });

  it('calls backlog.removeRelatedIssue with the issue ID', async () => {
    await tool.handler({ issueId: 1, relatedIssueId: 2 });

    expect(mockBacklog.removeRelatedIssue).toHaveBeenCalledWith(1, 2);
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({ relatedIssueId: 2 })).rejects.toThrow(Error);
  });
});
