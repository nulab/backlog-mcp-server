import { deleteVersionTool } from './deleteVersion.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('deleteVersionTool', () => {
  const mockBacklog: Partial<Backlog> = {
    deleteVersions: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      projectId: 100,
      name: 'Test Version',
      description: '',
      startDate: null,
      releaseDueDate: null,
      archived: false,
      displayOrder: 0,
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = deleteVersionTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns deleted version information', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      id: 1,
    });

    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('name', 'Test Version');
  });

  it('calls backlog.deleteVersions with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
      id: 1,
    });

    expect(mockBacklog.deleteVersions).toHaveBeenCalledWith('TEST', 1);
  });

  it('calls backlog.deleteVersions with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
      id: 1,
    });

    expect(mockBacklog.deleteVersions).toHaveBeenCalledWith(100, 1);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = { id: 1 }; // No identifier provided

    await expect(tool.handler(params)).rejects.toThrowError(Error);
  });
});
