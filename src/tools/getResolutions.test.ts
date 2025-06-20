import { getResolutionsTool } from './getResolutions.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getResolutionsTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getResolutions: jest.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 0,
        name: 'Fixed',
      },
      {
        id: 1,
        name: "Won't Fix",
      },
      {
        id: 2,
        name: 'Invalid',
      },
      {
        id: 3,
        name: 'Duplicate',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getResolutionsTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns resolutions list as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result).toHaveLength(4);
    expect(result[0].name).toContain('Fixed');
    expect(result[1].name).toContain("Won't Fix");
    expect(result[2].name).toContain('Invalid');
    expect(result[3].name).toContain('Duplicate');
  });

  it('calls backlog.getResolutions', async () => {
    await tool.handler({});

    expect(mockBacklog.getResolutions).toHaveBeenCalled();
  });
});
