import { getMyselfTool } from './getMyself.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getMyselfTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getMyself: jest.fn<() => Promise<any>>().mockResolvedValue({
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
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getMyselfTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns current user information as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.name).toContain('Current User');
    expect(result.mailAddress).toContain('current@example.com');
  });

  it('calls backlog.getMyself', async () => {
    await tool.handler({});

    expect(mockBacklog.getMyself).toHaveBeenCalled();
  });
});
