import { getRelatedIssuesTool } from './getRelatedIssues.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getRelatedIssues } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getRelatedIssues: vi.fn(),
}));

describe('getRelatedIssuesTool', () => {
  const relatedIssue = {
    id: 2,
    projectId: 100,
    issueKey: 'TEST-2',
    keyId: 2,
    summary: 'Related Issue',
    type: 'RELATES',
  };

  vi.mocked(getRelatedIssues).mockResolvedValue([relatedIssue] as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getRelatedIssuesTool(mockClient, mockDescriptionHelper);

  it('returns the related issues with their relation type', async () => {
    const result = await tool.handler({ issueKey: 'TEST-1' });

    if (!Array.isArray(result)) {
      throw new Error('Expected an array result');
    }
    expect(result).toHaveLength(1);
    expect(result[0].issueKey).toEqual('TEST-2');
    expect(result[0].type).toEqual('RELATES');
  });

  it('calls getRelatedIssues with the issue key', async () => {
    await tool.handler({ issueKey: 'TEST-1' });

    expect(getRelatedIssues).toHaveBeenCalledWith(mockClient, 'TEST-1');
  });

  it('calls getRelatedIssues with the issue ID', async () => {
    await tool.handler({ issueId: 1 });

    expect(getRelatedIssues).toHaveBeenCalledWith(mockClient, 1);
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });
});
