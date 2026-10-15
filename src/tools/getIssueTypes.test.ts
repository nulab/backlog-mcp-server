import { getIssueTypesTool } from './getIssueTypes.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getIssueTypes } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getIssueTypes: vi.fn(),
}));

describe('getIssueTypesTool', () => {
  vi.mocked(getIssueTypes).mockResolvedValue([
    {
      id: 1,
      projectId: 100,
      name: 'Bug',
      color: '#990000',
    },
    {
      id: 2,
      projectId: 100,
      name: 'Task',
      color: '#7ea800',
    },
    {
      id: 3,
      projectId: 100,
      name: 'Request',
      color: '#ff9200',
    },
  ] as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getIssueTypesTool(mockClient, mockDescriptionHelper);

  it('returns issue types list as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result).toHaveLength(3);
    expect(result[0].name).toContain('Bug');
    expect(result[1].name).toContain('Task');
    expect(result[2].name).toContain('Request');
  });

  it('calls getIssueTypes with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(getIssueTypes).toHaveBeenCalledWith(mockClient, 'TEST');
  });

  it('calls getIssueTypes with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
    });

    expect(getIssueTypes).toHaveBeenCalledWith(mockClient, 100);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
