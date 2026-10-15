import { addWikiTool } from './addWiki.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { postWiki } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  postWiki: vi.fn(),
}));

describe('addWikiTool', () => {
  vi.mocked(postWiki).mockResolvedValue({
    id: 1,
    projectId: 100,
    name: 'Getting Started',
    content: '# Welcome to the project\n\nThis is a wiki page.',
    createdUser: {
      id: 1,
      userId: 'admin',
      name: 'Admin User',
      roleType: 1,
      lang: 'en',
      mailAddress: 'admin@example.com',
    },
    created: '2023-01-01T00:00:00Z',
    updatedUser: {
      id: 1,
      userId: 'admin',
      name: 'Admin User',
      roleType: 1,
      lang: 'en',
      mailAddress: 'admin@example.com',
    },
    updated: '2023-01-01T00:00:00Z',
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = addWikiTool(mockClient, mockDescriptionHelper);

  it('returns created wiki as formatted JSON text', async () => {
    const result = await tool.handler({
      projectId: 100,
      name: 'Getting Started',
      content: '# Welcome to the project\n\nThis is a wiki page.',
      mailNotify: false,
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.name).toEqual('Getting Started');
    expect(result.content).toContain('Welcome to the project');
  });

  it('calls postWiki with correct params', async () => {
    const params = {
      projectId: 100,
      name: 'Getting Started',
      content: '# Welcome to the project\n\nThis is a wiki page.',
      mailNotify: false,
    };

    await tool.handler(params);

    expect(postWiki).toHaveBeenCalledWith(mockClient, {
      projectId: 100,
      name: 'Getting Started',
      content: '# Welcome to the project\n\nThis is a wiki page.',
      mailNotify: false,
    });
  });
});
