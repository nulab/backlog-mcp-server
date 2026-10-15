import { getMyselfTool } from './getMyself.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getMyself } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getMyself: vi.fn(),
}));

describe('getMyselfTool', () => {
  vi.mocked(getMyself).mockResolvedValue({
    id: 1,
    userId: 'current_user',
    name: 'Current User',
    roleType: 1,
    lang: 'en',
    mailAddress: 'current@example.com',
    lastLoginTime: '2023-01-01T00:00:00Z',
    nulabAccount: {
      nulabId: '12345',
      name: 'Current User',
      uniqueId: 'current_user',
    },
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getMyselfTool(mockClient, mockDescriptionHelper);

  it('returns current user information as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.name).toContain('Current User');
    expect(result.mailAddress).toContain('current@example.com');
  });

  it('calls getMyself', async () => {
    await tool.handler({});

    expect(getMyself).toHaveBeenCalled();
  });
});
