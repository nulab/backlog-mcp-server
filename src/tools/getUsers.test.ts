import { getUsersTool } from './getUsers.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getUsersTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getUsers: jest.fn<() => Promise<any>>().mockResolvedValue([
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
  const tool = getUsersTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns users list as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (!Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result).toHaveLength(2);
    expect(result[0].name).toContain('Admin User');
    expect(result[1].name).toContain('Regular User');
  });

  it('calls backlog.getUsers', async () => {
    await tool.handler({});

    expect(mockBacklog.getUsers).toHaveBeenCalled();
  });
});
