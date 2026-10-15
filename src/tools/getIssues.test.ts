import { getIssuesTool } from './getIssues.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getIssues } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getIssues: vi.fn(),
}));

describe('getIssuesTool', () => {
  vi.mocked(getIssues).mockResolvedValue([
    {
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
      summary: 'Test Issue 1',
      description: 'This is test issue 1',
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
    },
    {
      id: 2,
      projectId: 100,
      issueKey: 'TEST-2',
      keyId: 2,
      issueType: {
        id: 2,
        projectId: 100,
        name: 'Bug',
        color: '#990000',
        displayOrder: 0,
      },
      summary: 'Test Issue 2',
      description: 'This is test issue 2',
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
      created: '2023-01-02T00:00:00Z',
      updated: '2023-01-02T00:00:00Z',
    },
  ] as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getIssuesTool(mockClient, mockDescriptionHelper);

  it('returns issues as formatted JSON text', async () => {
    const result = await tool.handler({
      projectId: [100],
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(2);
    expect(result[0].summary).toEqual('Test Issue 1');
    expect(result[1].summary).toEqual('Test Issue 2');
  });

  it('calls getIssues with correct params', async () => {
    const params = {
      projectId: [100],
      statusId: [1],
      sort: 'updated' as const,
      order: 'desc' as const,
      count: 10,
    };

    await tool.handler(params);

    expect(getIssues).toHaveBeenCalledWith(mockClient, params);
  });

  it('calls getIssues with keyword search', async () => {
    await tool.handler({
      keyword: 'bug',
    });

    expect(getIssues).toHaveBeenCalledWith(mockClient, {
      keyword: 'bug',
    });
  });

  it('calls getIssues with custom fields', async () => {
    await tool.handler({
      projectId: [100],
      customFields: [
        { id: 12345, type: 'text', value: 'test-value' },
        { id: 67890, type: 'numeric', min: 10, max: 20 },
        { id: 13579, type: 'date', min: '2024-01-01' },
        { id: 24680, type: 'list', value: 5 },
      ],
    });

    expect(getIssues).toHaveBeenCalledWith(mockClient, {
      projectId: [100],
      customField_12345: 'test-value',
      customField_67890_min: 10,
      customField_67890_max: 20,
      customField_13579_min: '2024-01-01',
      customField_24680: [5],
    });
  });

  it('calls getIssues with custom fields array values', async () => {
    await tool.handler({
      customFields: [{ id: 11111, type: 'list', value: [1, 2, 3] }],
    });

    expect(getIssues).toHaveBeenCalledWith(mockClient, {
      customField_11111: [1, 2, 3],
    });
  });

  it('calls getIssues with empty custom fields', async () => {
    await tool.handler({
      projectId: [100],
      customFields: [],
    });

    expect(getIssues).toHaveBeenCalledWith(mockClient, {
      projectId: [100],
    });
  });

  it('calls getIssues without custom fields', async () => {
    await tool.handler({
      projectId: [100],
      statusId: [1],
    });

    expect(getIssues).toHaveBeenCalledWith(mockClient, {
      projectId: [100],
      statusId: [1],
    });
  });
});
