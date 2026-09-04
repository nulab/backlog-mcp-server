import { addCategoryTool } from './addCategory.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

describe('addCategoryTool', () => {
  const mockBacklog: Partial<Backlog> = {
    postCategories: vi.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      projectId: 100,
      name: 'Support',
      displayOrder: 0,
    }),
  };

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = addCategoryTool(
    mockBacklog as Backlog,
    mockDescriptionHelper
  );

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

  it('calls backlog.postCategories with correct params when using projectKey', async () => {
    await tool.handler({
      projectKey: 'TEST',
      name: 'Support',
    });

    expect(mockBacklog.postCategories).toHaveBeenCalledWith('TEST', {
      name: 'Support',
    });
  });

  it('calls backlog.postCategories with correct params when using projectId', async () => {
    await tool.handler({
      projectId: 100,
      name: 'Development',
    });

    expect(mockBacklog.postCategories).toHaveBeenCalledWith(100, {
      name: 'Development',
    });
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    await expect(
      tool.handler({
        name: 'Support',
      } as any)
    ).rejects.toThrow(Error);
  });
});
