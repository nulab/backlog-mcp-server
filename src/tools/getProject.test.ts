import { getProjectTool } from './getProject.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getProject } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getProject: vi.fn(),
}));

describe('getProjectTool', () => {
  vi.mocked(getProject).mockResolvedValue({
    id: 1,
    projectKey: 'TEST',
    name: 'Test Project',
    chartEnabled: true,
    subtaskingEnabled: true,
    projectLeaderCanEditProjectLeader: false,
    textFormattingRule: 'backlog',
    archived: false,
    displayOrder: 0,
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getProjectTool(mockClient, mockDescriptionHelper);

  it('returns project information as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.name).toContain('Test Project');
    expect(result.projectKey).toContain('TEST');
  });

  it('calls getProject with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(getProject).toHaveBeenCalledWith(mockClient, 'TEST');
  });

  it('calls getProject with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 1,
    });

    expect(getProject).toHaveBeenCalledWith(mockClient, 1);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
