import { addRelatedIssueTool } from './addRelatedIssue.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { addRelatedIssue } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  addRelatedIssue: vi.fn(),
}));

describe('addRelatedIssueTool', () => {
  vi.mocked(addRelatedIssue).mockResolvedValue({
    id: 2,
    projectId: 100,
    issueKey: 'TEST-2',
    keyId: 2,
    summary: 'Related Issue',
    type: 'RELATES',
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = addRelatedIssueTool(mockClient, mockDescriptionHelper);

  it('returns the related issue with its relation type', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
      targetIssueId: 2,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.issueKey).toEqual('TEST-2');
    expect(result.type).toEqual('RELATES');
  });

  it('calls addRelatedIssue with the issue key and target issue ID', async () => {
    await tool.handler({ issueKey: 'TEST-1', targetIssueId: 2 });

    expect(addRelatedIssue).toHaveBeenCalledWith(mockClient, 'TEST-1', {
      targetIssueId: 2,
    });
  });

  it('calls addRelatedIssue with the issue ID', async () => {
    await tool.handler({ issueId: 1, targetIssueId: 2 });

    expect(addRelatedIssue).toHaveBeenCalledWith(mockClient, 1, {
      targetIssueId: 2,
    });
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({ targetIssueId: 2 })).rejects.toThrow(Error);
  });
});
