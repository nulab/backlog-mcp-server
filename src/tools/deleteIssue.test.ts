import { deleteIssueTool } from './deleteIssue.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('deleteIssueTool', () => {
  const mockBacklog: Partial<Backlog> = {
    deleteIssue: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      projectId: 100,
      issueKey: 'TEST-1',
      keyId: 1,
      issueType: {
        id: 2,
        projectId: 100,
        name: 'Bug',
        color: '#990000',
        displayOrder: 0,
      },
      summary: 'Test Issue',
      description: 'This is a test issue',
      status: {
        id: 1,
        name: 'Open',
        projectId: 100,
        color: '#ff0000',
        displayOrder: 0,
      },
      priority: {
        id: 3,
        name: 'Normal',
      },
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = deleteIssueTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns deleted issue information', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
    });

    expect(result).toHaveProperty('issueKey', 'TEST-1');
    expect(result).toHaveProperty('summary', 'Test Issue');
  });

  it('calls backlog.deleteIssue with correct params when using issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
    });

    expect(mockBacklog.deleteIssue).toHaveBeenCalledWith('TEST-1');
  });

  it('calls backlog.deleteIssue with correct params when using issue ID', async () => {
    await tool.handler({
      issueId: 1,
    });

    expect(mockBacklog.deleteIssue).toHaveBeenCalledWith(1); // Expect number
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });
});
