import { getPrioritiesTool } from './getPriorities.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getPriorities } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getPriorities: vi.fn(),
}));

describe('getPrioritiesTool', () => {
  vi.mocked(getPriorities).mockResolvedValue([
    {
      id: 2,
      name: 'High',
    },
    {
      id: 3,
      name: 'Normal',
    },
    {
      id: 4,
      name: 'Low',
    },
  ] as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getPrioritiesTool(mockClient, mockDescriptionHelper);

  it('returns priorities list as formatted JSON text', async () => {
    const result = await tool.handler({});

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(3);
    expect(result[0].name).toContain('High');
    expect(result[1].name).toContain('Normal');
    expect(result[2].name).toContain('Low');
  });

  it('calls getPriorities', async () => {
    await tool.handler({});

    expect(getPriorities).toHaveBeenCalled();
  });
});
