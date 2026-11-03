import { getStatusesTool } from './getStatuses.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getProjectStatuses } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getProjectStatuses: vi.fn(),
}));

describe('getStatusesTool', () => {
  vi.mocked(getProjectStatuses).mockResolvedValue([
    {
      id: 1,
      projectId: 100,
      name: 'Open',
      color: '#ed8077',
      displayOrder: 1000,
    },
    {
      id: 2,
      projectId: 100,
      name: 'In Progress',
      color: '#4488c5',
      displayOrder: 2000,
    },
    {
      id: 3,
      projectId: 100,
      name: 'Resolved',
      color: '#5eb5a6',
      displayOrder: 3000,
    },
  ]);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getStatusesTool(mockClient, mockDescriptionHelper);

  it('returns project statuses list', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result).toHaveLength(3);
    expect(result[0].name).toContain('Open');
    expect(result[1].name).toContain('In Progress');
    expect(result[2].name).toContain('Resolved');
  });

  it('calls getProjectStatuses with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(getProjectStatuses).toHaveBeenCalledWith(mockClient, 'TEST');
  });

  it('calls getProjectStatuses with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
    });

    expect(getProjectStatuses).toHaveBeenCalledWith(mockClient, 100);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {};

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
