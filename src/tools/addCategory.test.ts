import { addCategoryTool } from './addCategory.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { postCategories } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  postCategories: vi.fn(),
}));

describe('addCategoryTool', () => {
  vi.mocked(postCategories).mockResolvedValue({
    id: 1,
    projectId: 100,
    name: 'Support',
    displayOrder: 0,
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = addCategoryTool(mockClient, mockDescriptionHelper);

  it('returns created category', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
      name: 'Support',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.id).toEqual(1);
    expect(result.projectId).toEqual(100);
    expect(result.name).toEqual('Support');
  });

  it('calls postCategories with correct params when using projectKey', async () => {
    await tool.handler({
      projectKey: 'TEST',
      name: 'Support',
    });

    expect(postCategories).toHaveBeenCalledWith(mockClient, 'TEST', {
      name: 'Support',
    });
  });

  it('calls postCategories with correct params when using projectId', async () => {
    await tool.handler({
      projectId: 100,
      name: 'Development',
    });

    expect(postCategories).toHaveBeenCalledWith(mockClient, 100, {
      name: 'Development',
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = { name: 'Support' };

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
