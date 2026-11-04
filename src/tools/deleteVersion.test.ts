import { deleteVersionTool } from './deleteVersion.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { deleteVersions } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  deleteVersions: vi.fn(),
}));

describe('deleteVersionTool', () => {
  vi.mocked(deleteVersions).mockResolvedValue({
    id: 1,
    projectId: 100,
    name: 'Test Version',
    description: '',
    startDate: null,
    releaseDueDate: null,
    archived: false,
    displayOrder: 0,
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = deleteVersionTool(mockClient, mockDescriptionHelper);

  it('returns deleted version information', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      id: 1,
    });

    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('name', 'Test Version');
  });

  it('calls deleteVersions with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
      id: 1,
    });

    expect(deleteVersions).toHaveBeenCalledWith(mockClient, 'TEST', 1);
  });

  it('calls deleteVersions with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
      id: 1,
    });

    expect(deleteVersions).toHaveBeenCalledWith(mockClient, 100, 1);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = { id: 1 }; // No identifier provided

    await expect(tool.handler(params)).rejects.toThrowError(Error);
  });
});
