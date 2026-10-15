import { getCategoriesTool } from './getCategories.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getCategories } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getCategories: vi.fn(),
}));

describe('getCategoriesTool', () => {
  vi.mocked(getCategories).mockResolvedValue([
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
  ] as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getCategoriesTool(mockClient, mockDescriptionHelper);

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

  it('calls getCategories with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(getCategories).toHaveBeenCalledWith(mockClient, 'TEST');
  });

  it('calls getCategories with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
    });

    expect(getCategories).toHaveBeenCalledWith(mockClient, 100);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    // Assuming resolveIdOrKey for "project" entity (as categories are project-specific)
    // throws "Project ID or key is required"
    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
