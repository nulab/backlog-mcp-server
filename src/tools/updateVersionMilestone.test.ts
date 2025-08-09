import { updateVersionMilestoneTool } from './updateVersionMilestone.js';
import { jest, describe, expect, it } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('updateVersionMilestoneTool', () => {
  const mockBacklog: Partial<Backlog> = {
    patchVersions: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      projectId: 100,
      name: 'Updated Version',
      description: 'Updated version description',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2023-12-31T00:00:00Z',
      archived: false,
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = updateVersionMilestoneTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns updated version milestone', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      projectId: 100,
      id: 1,
      name: 'Updated Version',
      description: 'Updated version description',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2023-12-31T00:00:00Z',
      archived: false,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.name).toEqual('Updated Version');
    expect(result.description).toEqual('Updated version description');
    expect(result.startDate).toEqual('2023-01-01T00:00:00Z');
    expect(result.releaseDueDate).toEqual('2023-12-31T00:00:00Z');
    expect(result.archived).toBe(false);
  });

  it('calls backlog.patchVersions with correct params when using projectKey', async () => {
    const params = {
      projectKey: 'TEST',
      id: 1,
      name: 'Updated Version',
      description: 'Updated version description',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2023-12-31T00:00:00Z',
      archived: false,
    };

    await tool.handler(params);

    expect(mockBacklog.patchVersions).toHaveBeenCalledWith('TEST', 1, {
      name: 'Updated Version',
      description: 'Updated version description',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2023-12-31T00:00:00Z',
      archived: false,
    });
  });

  it('calls backlog.pathVersions with correct params when using projectId', async () => {
    const params = {
      projectId: 100,
      id: 1,
      name: 'Updated Version',
      description: 'Updated version description',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2023-12-31T00:00:00Z',
      archived: false,
    };

    await tool.handler(params);

    expect(mockBacklog.patchVersions).toHaveBeenCalledWith(100, 1, {
      name: 'Updated Version',
      description: 'Updated version description',
      startDate: '2023-01-01T00:00:00Z',
      releaseDueDate: '2023-12-31T00:00:00Z',
      archived: false,
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {
      // projectId and projectKey are missing
      id: 1,
      name: 'Version without project',
      description: 'This should fail',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });

  it('throws an error if id is not provided', async () => {
    const params = {
      projectKey: 'TEST',
      // id is missing
      name: 'Version without ID',
      description: 'This should fail',
    };

    await expect(tool.handler(params as any)).rejects.toThrow(
      'Version ID is required'
    );
  });
});
