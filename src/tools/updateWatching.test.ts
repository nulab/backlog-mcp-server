import { updateWatchingTool } from './updateWatching.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { patchWatchingListItem } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  patchWatchingListItem: vi.fn(),
}));

describe('updateWatchingTool', () => {
  vi.mocked(patchWatchingListItem).mockResolvedValue({
    id: 1,
    resourceAlreadyRead: false,
    note: 'Updated note',
    type: 'issue',
    issue: {
      id: 1000,
      projectId: 100,
      issueKey: 'TEST-1',
      summary: 'Test issue',
    },
    created: '2023-01-01T00:00:00Z',
    updated: '2023-01-02T00:00:00Z',
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = updateWatchingTool(mockClient, mockDescriptionHelper);

  it('returns updated watching item', async () => {
    const result = await tool.handler({
      watchId: 1,
      note: 'Updated note',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result).toHaveProperty('id', 1);
    expect(result.note).toBe('Updated note');
  });

  it('calls patchWatchingListItem with correct params', async () => {
    await tool.handler({
      watchId: 1,
      note: 'Updated note',
    });

    expect(patchWatchingListItem).toHaveBeenCalledWith(
      mockClient,
      1,
      'Updated note'
    );
  });
});
