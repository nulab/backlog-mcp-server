import { updateProjectTool } from './updateProject.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { patchProject } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  patchProject: vi.fn(),
}));

describe('updateProjectTool', () => {
  vi.mocked(patchProject).mockResolvedValue({
    id: 1,
    projectKey: 'UPDATED',
    name: 'Updated Project',
    chartEnabled: true,
    subtaskingEnabled: true,
    projectLeaderCanEditProjectLeader: false,
    textFormattingRule: 'markdown',
    archived: true,
    displayOrder: 0,
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = updateProjectTool(mockClient, mockDescriptionHelper);

  it('returns updated project', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      name: 'Updated Project',
      key: 'UPDATED',
      archived: true,
    });

    expect(result).toHaveProperty('name', 'Updated Project');
    expect(result).toHaveProperty('projectKey', 'UPDATED');
    expect(result).toHaveProperty('archived', true);
  });

  it('calls patchProject with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
      name: 'Updated Project',
      key: 'UPDATED',
      textFormattingRule: 'markdown',
      archived: true,
    });

    expect(patchProject).toHaveBeenCalledWith(mockClient, 'TEST', {
      name: 'Updated Project',
      key: 'UPDATED',
      chartEnabled: undefined,
      subtaskingEnabled: undefined,
      projectLeaderCanEditProjectLeader: undefined,
      textFormattingRule: 'markdown',
      archived: true,
    });
  });

  it('calls patchProject with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 1,
      chartEnabled: true,
      subtaskingEnabled: true,
    });

    expect(patchProject).toHaveBeenCalledWith(mockClient, 1, {
      name: undefined,
      key: undefined,
      chartEnabled: true,
      subtaskingEnabled: true,
      projectLeaderCanEditProjectLeader: undefined,
      textFormattingRule: undefined,
      archived: undefined,
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      // projectId and projectKey are missing
      name: 'Test Project Name',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
