import { getCategoriesTool } from './getCategories.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getCategoriesTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getCategories: jest.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 1,
        name: 'Bug',
        displayOrder: 0,
      },
      {
        id: 2,
        name: 'Feature',
        displayOrder: 1,
      },
      {
        id: 3,
        name: 'Support',
        displayOrder: 2,
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getCategoriesTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns categories list as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(3);
    expect(result[0].name).toContain('Bug');
    expect(result[1].name).toContain('Feature');
    expect(result[2].name).toContain('Support');
  });

  it('calls backlog.getCategories with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(mockBacklog.getCategories).toHaveBeenCalledWith('TEST');
  });

  it('calls backlog.getCategories with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
    });

    expect(mockBacklog.getCategories).toHaveBeenCalledWith(100);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    // Assuming resolveIdOrKey for "project" entity (as categories are project-specific)
    // throws "Project ID or key is required"
    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
