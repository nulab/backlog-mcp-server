import { removeRelatedIssueTool } from './removeRelatedIssue.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { removeRelatedIssue } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  removeRelatedIssue: vi.fn(),
}));

describe('removeRelatedIssueTool', () => {
  vi.mocked(removeRelatedIssue).mockResolvedValue({
    id: 2,
    projectId: 100,
    issueKey: 'TEST-2',
    keyId: 2,
    summary: 'Related Issue',
    type: 'RELATES',
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = removeRelatedIssueTool(mockClient, mockDescriptionHelper);

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

  it('calls removeRelatedIssue with the issue key and related issue ID', async () => {
    await tool.handler({ issueKey: 'TEST-1', relatedIssueId: 2 });

    expect(removeRelatedIssue).toHaveBeenCalledWith(mockClient, 'TEST-1', 2);
  });

  it('calls removeRelatedIssue with the issue ID', async () => {
    await tool.handler({ issueId: 1, relatedIssueId: 2 });

    expect(removeRelatedIssue).toHaveBeenCalledWith(mockClient, 1, 2);
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({ relatedIssueId: 2 })).rejects.toThrow(Error);
  });
});
