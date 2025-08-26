import { getVersionMilestoneListTool } from './getVersionMilestoneList.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getVersionMilestoneTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getVersions: jest.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 1,
        projectId: 1,
        name: 'wait for release',
        description: '',
        startDate: null,
        releaseDueDate: null,
        archived: false,
        displayOrder: 0,
      },
      {
        id: 2,
        projectId: 1,
        name: 'v1.0.0',
        description: 'First release',
        startDate: '2025-01-01',
        releaseDueDate: '2025-03-01',
        archived: false,
        displayOrder: 1,
      },
      {
        id: 3,
        projectId: 1,
        name: 'v1.1.0',
        description: 'Minor update',
        startDate: '2025-03-01',
        releaseDueDate: '2025-05-01',
        archived: false,
        displayOrder: 2,
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getVersionMilestoneListTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns versions list as formatted JSON text', async () => {
    const result = await tool.handler({ projectId: 123 });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(3);
    expect(result[0].name).toContain('wait for release');
    expect(result[1].name).toContain('v1.0.0');
    expect(result[2].name).toContain('v1.1.0');
  });

  it('calls backlog.getVersions with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST_PROJECT',
    });

    expect(mockBacklog.getVersions).toHaveBeenCalledWith('TEST_PROJECT');
  });

  it('calls backlog.getVersions with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 123,
    });

    expect(mockBacklog.getVersions).toHaveBeenCalledWith(123);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
