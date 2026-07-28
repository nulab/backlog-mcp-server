import { getRelatedIssuesTool } from './getRelatedIssues.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getRelatedIssuesTool', () => {
  const relatedIssue = {
    id: 2,
    projectId: 100,
    issueKey: 'TEST-2',
    keyId: 2,
    summary: 'Related Issue',
    type: 'RELATES',
  };

  const mockBacklog: Partial<Backlog> = {
    getRelatedIssues: vi
      .fn<() => Promise<any>>()
      .mockResolvedValue([relatedIssue]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getRelatedIssuesTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns the related issues with their relation type', async () => {
    const result = await tool.handler({ issueKey: 'TEST-1' });

    if (!Array.isArray(result)) {
      throw new Error('Expected an array result');
    }
    expect(result).toHaveLength(1);
    expect(result[0].issueKey).toEqual('TEST-2');
    expect(result[0].type).toEqual('RELATES');
  });

  it('calls backlog.getRelatedIssues with the issue key', async () => {
    await tool.handler({ issueKey: 'TEST-1' });

    expect(mockBacklog.getRelatedIssues).toHaveBeenCalledWith('TEST-1');
  });

  it('calls backlog.getRelatedIssues with the issue ID', async () => {
    await tool.handler({ issueId: 1 });

    expect(mockBacklog.getRelatedIssues).toHaveBeenCalledWith(1);
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });
});
