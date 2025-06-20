import { addProjectTool } from './addProject.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('addProjectTool', () => {
  const mockBacklog: Partial<Backlog> = {
    postProject: jest.fn<() => Promise<any>>().mockResolvedValue({
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
  const tool = addProjectTool(mockBacklog as Backlog, mockTranslationHelper);

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

  it('calls backlog.postProject with correct params', async () => {
    await tool.handler({
      name: 'Test Project',
      key: 'TEST',
      chartEnabled: true,
      subtaskingEnabled: true,
    });

    expect(mockBacklog.postProject).toHaveBeenCalledWith({
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

    expect(mockBacklog.postProject).toHaveBeenCalledWith({
      name: 'Test Project',
      key: 'TEST',
      chartEnabled: false,
      subtaskingEnabled: false,
      projectLeaderCanEditProjectLeader: false,
      textFormattingRule: 'backlog',
    });
  });
});
