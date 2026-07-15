import { getProjectUsersTool } from './getProjectUsers.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getProjectUsersTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getProjectUsers: vi.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 1,
        userId: 'admin',
        name: 'Admin User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'admin@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        userId: 'user1',
        name: 'Regular User',
        roleType: 2,
        lang: 'en',
        mailAddress: 'user1@example.com',
        lastLoginTime: '2023-01-02T00:00:00Z',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getProjectUsersTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns project users list', async () => {
    const result = await tool.handler({ projectId: 100 });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result).toHaveLength(2);
    expect(result[0].name).toContain('Admin User');
    expect(result[1].name).toContain('Regular User');
  });

  it('calls backlog.getProjectUsers with the resolved project id', async () => {
    await tool.handler({ projectId: 100 });

    expect(mockBacklog.getProjectUsers).toHaveBeenCalledWith(100);
  });

  it('calls backlog.getProjectUsers with the project key', async () => {
    await tool.handler({ projectKey: 'PROJECT' });

    expect(mockBacklog.getProjectUsers).toHaveBeenCalledWith('PROJECT');
  });

  it('throws when neither projectId nor projectKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow();
  });
});
