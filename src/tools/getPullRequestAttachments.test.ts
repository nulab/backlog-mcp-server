import { getPullRequestAttachmentsTool } from './getPullRequestAttachments.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getPullRequestAttachmentsTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getPullRequestAttachments: vi.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 300,
        name: 'diff.patch',
        size: 2048,
        createdUser: {
          id: 1,
          userId: 'admin',
          name: 'Admin User',
          roleType: 1,
          lang: 'en',
          mailAddress: 'admin@example.com',
          lastLoginTime: '2023-01-01T00:00:00Z',
        },
        created: '2023-01-01T00:00:00Z',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getPullRequestAttachmentsTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns pull request attachments', async () => {
    const result = await tool.handler({
      projectKey: 'PROJ',
      repoIdOrName: 'my-repo',
      number: 1,
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('name', 'diff.patch');
  });

  it('calls backlog.getPullRequestAttachments with correct params', async () => {
    await tool.handler({
      projectId: 5,
      repoIdOrName: 'my-repo',
      number: 1,
    });

    expect(mockBacklog.getPullRequestAttachments).toHaveBeenCalledWith(
      5,
      'my-repo',
      1
    );
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    await expect(
      tool.handler({ repoIdOrName: 'my-repo', number: 1 })
    ).rejects.toThrow(Error);
  });
});
