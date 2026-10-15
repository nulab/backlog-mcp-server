import { getSpaceTool } from './getSpace.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getSpace } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getSpace: vi.fn(),
}));

describe('getSpaceTool', () => {
  vi.mocked(getSpace).mockResolvedValue({
    spaceKey: 'demo',
    name: 'Demo Space',
    ownerId: 1,
    lang: 'en',
    timezone: 'Asia/Tokyo',
    reportSendTime: '08:00:00',
    textFormattingRule: 'backlog',
    created: '2023-01-01T00:00:00Z',
    updated: '2023-01-01T00:00:00Z',
  } as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getSpaceTool(mockClient, mockDescriptionHelper);

  it('returns space information as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.name).toEqual('Demo Space');
    expect(result.spaceKey).toEqual('demo');
  });

  it('calls getSpace', async () => {
    await tool.handler({});

    expect(getSpace).toHaveBeenCalledWith(mockClient);
  });
});
