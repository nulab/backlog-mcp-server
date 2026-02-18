import { addVersionMilestoneTool } from './addVersionMilestone.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('addVersionMilestoneTool', () => {
  const mockBacklog: Partial<Backlog> = {
    postVersions: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      projectId: 100,
      name: 'Version 1.0.0',
      description: 'Initial release version',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2023-03-31T00:00:00Z',
      archived: false,
      displayOrder: 1,
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = addVersionMilestoneTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns created version milestone as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      name: 'Version 1.0.0',
      description: 'Initial release version',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2023-03-31T00:00:00Z',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.name).toEqual('Version 1.0.0');
    expect(result.description).toEqual('Initial release version');
    expect(result.startDate).toEqual('2023-01-01T00:00:00Z');
    expect(result.releaseDueDate).toEqual('2023-03-31T00:00:00Z');
  });

  it('calls backlog.postVersions with correct params when using projectKey', async () => {
    const params = {
      projectKey: 'TEST',
      name: 'Version 1.0.0',
      description: 'Initial release version',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2024-03-31T00:00:00Z',
    };

    await tool.handler(params);

    expect(mockBacklog.postVersions).toHaveBeenCalledWith('TEST', {
      name: 'Version 1.0.0',
      description: 'Initial release version',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2024-03-31T00:00:00Z',
    });
  });

  it('calls backlog.postVersions with correct params when using projectId', async () => {
    const params = {
      projectId: 100,
      name: 'Version 2.0.0',
      description: 'Major release',
      startDate: '2023-04-01T00:00:00Z',
      releaseDueDate: '2023-06-30T00:00:00Z',
    };

    await tool.handler(params);

    expect(mockBacklog.postVersions).toHaveBeenCalledWith(100, {
      name: 'Version 2.0.0',
      description: 'Major release',
      startDate: '2023-04-01T00:00:00Z',
      releaseDueDate: '2023-06-30T00:00:00Z',
    });
  });

  it('calls backlog.postVersions with minimal required params', async () => {
    const params = {
      projectKey: 'TEST',
      name: 'Quick Version',
    };

    await tool.handler(params);

    expect(mockBacklog.postVersions).toHaveBeenCalledWith('TEST', {
      name: 'Quick Version',
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      // projectId and projectKey are missing
      name: 'Version without project',
      description: 'This should fail',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
