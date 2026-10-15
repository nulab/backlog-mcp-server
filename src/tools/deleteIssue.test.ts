import { deleteIssueTool } from './deleteIssue.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { deleteIssue } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  deleteIssue: vi.fn(),
}));

describe('deleteIssueTool', () => {
  vi.mocked(deleteIssue).mockResolvedValue({
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
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = deleteIssueTool(mockClient, mockDescriptionHelper);

  it('returns deleted issue information', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
    });

    expect(result).toHaveProperty('issueKey', 'TEST-1');
    expect(result).toHaveProperty('summary', 'Test Issue');
  });

  it('calls deleteIssue with correct params when using issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
    });

    expect(deleteIssue).toHaveBeenCalledWith(mockClient, 'TEST-1');
  });

  it('calls deleteIssue with correct params when using issue ID', async () => {
    await tool.handler({
      issueId: 1,
    });

    expect(deleteIssue).toHaveBeenCalledWith(mockClient, 1); // Expect number
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });
});
