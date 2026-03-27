import { getPrioritiesTool } from './getPriorities.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getPrioritiesTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getPriorities: vi.fn<() => Promise<any>>().mockResolvedValue([
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
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getPrioritiesTool(mockBacklog as Backlog, mockTranslationHelper);

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

  it('calls backlog.getPriorities', async () => {
    await tool.handler({});

    expect(mockBacklog.getPriorities).toHaveBeenCalled();
  });
});
