import { deleteProjectTool } from './deleteProject.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('deleteProjectTool', () => {
  const mockBacklog: Partial<Backlog> = {
    deleteProject: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      projectKey: 'TEST',
      name: 'Test Project',
      chartEnabled: true,
      subtaskingEnabled: true,
      projectLeaderCanEditProjectLeader: false,
      textFormattingRule: 'backlog',
      archived: false,
      displayOrder: 0,
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = deleteProjectTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns deleted project information', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    expect(result).toHaveProperty('projectKey', 'TEST');
    expect(result).toHaveProperty('name', 'Test Project');
  });

  it('calls backlog.deleteProject with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(mockBacklog.deleteProject).toHaveBeenCalledWith('TEST');
  });

  it('calls backlog.deleteProject with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 1,
    });

    expect(mockBacklog.deleteProject).toHaveBeenCalledWith(1);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    // Assuming resolveIdOrKey for "project" entity throws "Project ID or key is required"
    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
