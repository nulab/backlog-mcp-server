import { getUsersTool } from './getUsers.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getUsers } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getUsers: vi.fn(),
}));

describe('getUsersTool', () => {
  vi.mocked(getUsers).mockResolvedValue([
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
  ] as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getUsersTool(mockClient, mockDescriptionHelper);

  it('returns users list as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (!Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result).toHaveLength(2);
    expect(result[0].name).toContain('Admin User');
    expect(result[1].name).toContain('Regular User');
  });

  it('calls getUsers', async () => {
    await tool.handler({});

    expect(getUsers).toHaveBeenCalledWith(mockClient);
  });
});
