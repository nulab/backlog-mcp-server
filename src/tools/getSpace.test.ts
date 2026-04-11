import { getSpaceTool } from './getSpace.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getSpaceTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getSpace: vi.fn<() => Promise<any>>().mockResolvedValue({
      spaceKey: 'demo',
      name: 'Demo Space',
      ownerId: 1,
      lang: 'en',
      timezone: 'Asia/Tokyo',
      reportSendTime: '08:00:00',
      textFormattingRule: 'backlog',
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getSpaceTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns space information as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.name).toEqual('Demo Space');
    expect(result.spaceKey).toEqual('demo');
  });

  it('calls backlog.getSpace', async () => {
    await tool.handler({});

    expect(mockBacklog.getSpace).toHaveBeenCalled();
  });
});
