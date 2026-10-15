import { deleteWatchingTool } from './deleteWatching.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { deletehWatchingListItem } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  deletehWatchingListItem: vi.fn(),
}));

describe('deleteWatchingTool', () => {
  vi.mocked(deletehWatchingListItem).mockResolvedValue({
    id: 1,
    resourceAlreadyRead: false,
    note: 'Deleted watch',
    type: 'issue',
    issue: {
      id: 1000,
      projectId: 100,
      issueKey: 'TEST-1',
      summary: 'Test issue',
    },
    created: '2023-01-01T00:00:00Z',
    updated: '2023-01-01T00:00:00Z',
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = deleteWatchingTool(mockClient, mockDescriptionHelper);

  it('deletes watching', async () => {
    const result = await tool.handler({
      watchId: 1,
    });

    expect(result).toHaveProperty('id', 1);
  });

  it('calls deletehWatchingListItem with correct params', async () => {
    await tool.handler({
      watchId: 123,
    });

    expect(deletehWatchingListItem).toHaveBeenCalledWith(mockClient, 123);
  });

  it('handles deletion of different watch IDs', async () => {
    await tool.handler({
      watchId: 456,
    });

    expect(deletehWatchingListItem).toHaveBeenCalledWith(mockClient, 456);
  });
});
