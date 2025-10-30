import { getIssuesTool } from './getIssues.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getIssuesTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getIssues: jest.fn<() => Promise<any>>().mockResolvedValue([
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
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getIssuesTool(mockBacklog as Backlog, mockTranslationHelper);

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

  it('calls backlog.getIssues with correct params', async () => {
    const params = {
      projectId: [100],
      statusId: [1],
      sort: 'updated' as const,
      order: 'desc' as const,
      count: 10,
    };

    await tool.handler(params);

    expect(mockBacklog.getIssues).toHaveBeenCalledWith(params);
  });

  it('calls backlog.getIssues with keyword search', async () => {
    await tool.handler({
      keyword: 'bug',
    });

    expect(mockBacklog.getIssues).toHaveBeenCalledWith({
      keyword: 'bug',
    });
  });

  it('calls backlog.getIssues with custom fields', async () => {
    await tool.handler({
      projectId: [100],
      customFields: [
        { id: 12345, type: 'text', value: 'test-value' },
        { id: 67890, type: 'numeric', min: 10, max: 20 },
        { id: 13579, type: 'date', min: '2024-01-01' },
        { id: 24680, type: 'list', value: 5 },
      ],
    });

    expect(mockBacklog.getIssues).toHaveBeenCalledWith({
      projectId: [100],
      customField_12345: 'test-value',
      customField_67890_min: 10,
      customField_67890_max: 20,
      customField_13579_min: '2024-01-01',
      customField_24680: 5,
    });
  });

  it('calls backlog.getIssues with custom fields array values', async () => {
    await tool.handler({
      customFields: [{ id: 11111, type: 'list', value: [1, 2, 3] }],
    });

    expect(mockBacklog.getIssues).toHaveBeenCalledWith({
      'customField_11111[]': [1, 2, 3],
    });
  });

  it('calls backlog.getIssues with empty custom fields', async () => {
    await tool.handler({
      projectId: [100],
      customFields: [],
    });

    expect(mockBacklog.getIssues).toHaveBeenCalledWith({
      projectId: [100],
    });
  });

  it('calls backlog.getIssues without custom fields', async () => {
    await tool.handler({
      projectId: [100],
      statusId: [1],
    });

    expect(mockBacklog.getIssues).toHaveBeenCalledWith({
      projectId: [100],
      statusId: [1],
    });
  });
});
