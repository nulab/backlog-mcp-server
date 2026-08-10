import { addRelatedIssueTool } from './addRelatedIssue.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

describe('addRelatedIssueTool', () => {
  const mockBacklog: Partial<Backlog> = {
    addRelatedIssue: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 2,
      projectId: 100,
      issueKey: 'TEST-2',
      keyId: 2,
      summary: 'Related Issue',
      type: 'RELATES',
    }),
  };

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = addRelatedIssueTool(
    mockBacklog as Backlog,
    mockDescriptionHelper
  );

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

  it('calls backlog.addRelatedIssue with the issue key and target issue ID', async () => {
    await tool.handler({ issueKey: 'TEST-1', targetIssueId: 2 });

    expect(mockBacklog.addRelatedIssue).toHaveBeenCalledWith('TEST-1', {
      targetIssueId: 2,
    });
  });

  it('calls backlog.addRelatedIssue with the issue ID', async () => {
    await tool.handler({ issueId: 1, targetIssueId: 2 });

    expect(mockBacklog.addRelatedIssue).toHaveBeenCalledWith(1, {
      targetIssueId: 2,
    });
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({ targetIssueId: 2 })).rejects.toThrow(Error);
  });
});
