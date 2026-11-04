import { getResolutionsTool } from './getResolutions.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getResolutions } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getResolutions: vi.fn(),
}));

describe('getResolutionsTool', () => {
  vi.mocked(getResolutions).mockResolvedValue([
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
  ] as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getResolutionsTool(mockClient, mockDescriptionHelper);

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

  it('calls getResolutions', async () => {
    await tool.handler({});

    expect(getResolutions).toHaveBeenCalledWith(mockClient);
  });
});
