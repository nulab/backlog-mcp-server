import { addProjectTool } from './addProject.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { postProject } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  postProject: vi.fn(),
}));

describe('addProjectTool', () => {
  vi.mocked(postProject).mockResolvedValue({
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
  const tool = addProjectTool(mockClient, mockDescriptionHelper);

  it('returns created project as formatted JSON text', async () => {
    const result = await tool.handler({
      name: 'Test Project',
      key: 'TEST',
      chartEnabled: true,
      subtaskingEnabled: true,
    });
    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.name).toEqual('Test Project');
    expect(result.projectKey).toEqual('TEST');
  });

  it('calls postProject with correct params', async () => {
    await tool.handler({
      name: 'Test Project',
      key: 'TEST',
      chartEnabled: true,
      subtaskingEnabled: true,
    });

    expect(postProject).toHaveBeenCalledWith(mockClient, {
      name: 'Test Project',
      key: 'TEST',
      chartEnabled: true,
      subtaskingEnabled: true,
      projectLeaderCanEditProjectLeader: false,
      textFormattingRule: 'backlog',
    });
  });

  it('uses default values for optional parameters', async () => {
    await tool.handler({
      name: 'Test Project',
      key: 'TEST',
    });

    expect(postProject).toHaveBeenCalledWith(mockClient, {
      name: 'Test Project',
      key: 'TEST',
      chartEnabled: false,
      subtaskingEnabled: false,
      projectLeaderCanEditProjectLeader: false,
      textFormattingRule: 'backlog',
    });
  });
});
