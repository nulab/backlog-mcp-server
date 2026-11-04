import { countIssuesTool } from './countIssues.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getIssuesCount } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getIssuesCount: vi.fn(),
}));

describe('countIssuesTool', () => {
  vi.mocked(getIssuesCount).mockResolvedValue({
    count: 42,
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = countIssuesTool(mockClient, mockDescriptionHelper);

  it('returns issue count', async () => {
    const result = await tool.handler({
      projectId: [100],
    });

    expect(result).toHaveProperty('count', 42);
  });

  it('calls getIssuesCount with correct params', async () => {
    const params = {
      projectId: [100],
      statusId: [1],
      keyword: 'bug',
    };

    await tool.handler(params);

    expect(getIssuesCount).toHaveBeenCalledWith(mockClient, params);
  });

  it('calls getIssuesCount with date filters', async () => {
    await tool.handler({
      createdSince: '2023-01-01',
      createdUntil: '2023-01-31',
    });

    expect(getIssuesCount).toHaveBeenCalledWith(mockClient, {
      createdSince: '2023-01-01',
      createdUntil: '2023-01-31',
    });
  });

  it('calls getIssuesCount with custom fields', async () => {
    await tool.handler({
      projectId: [100],
      customFields: [
        { id: 12345, type: 'text', value: 'test-value' },
        { id: 67890, type: 'numeric', min: 1, max: 5 },
      ],
    });

    expect(getIssuesCount).toHaveBeenCalledWith(mockClient, {
      projectId: [100],
      customField_12345: 'test-value',
      customField_67890_min: 1,
      customField_67890_max: 5,
    });
  });

  it('calls getIssuesCount with custom fields array values', async () => {
    await tool.handler({
      customFields: [{ id: 11111, type: 'list', value: [7, 8] }],
    });

    expect(getIssuesCount).toHaveBeenCalledWith(mockClient, {
      customField_11111: [7, 8],
    });
  });

  it('calls getIssuesCount with empty custom fields', async () => {
    await tool.handler({
      projectId: [100],
      customFields: [],
    });

    expect(getIssuesCount).toHaveBeenCalledWith(mockClient, {
      projectId: [100],
    });
  });

  it('calls getIssuesCount without custom fields', async () => {
    await tool.handler({
      projectId: [100],
      statusId: [1],
    });

    expect(getIssuesCount).toHaveBeenCalledWith(mockClient, {
      projectId: [100],
      statusId: [1],
    });
  });
});
