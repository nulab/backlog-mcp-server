import { getDocumentTreeTool } from './getDocumentTree.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getDocumentTree } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getDocumentTree: vi.fn(),
}));
describe('getDocumentTreeTool', () => {
  vi.mocked(getDocumentTree).mockResolvedValue({
    projectId: 1,
    activeTree: {
      id: 'Active',
      children: [
        {
          id: '01934345404771adb2113d7792bb4351',
          name: 'local test',
          children: [
            {
              id: '019347fc760c7b0abff04b44628c94d7',
              name: 'test2',
              children: [
                {
                  id: '0192ff5990da76c289dee06b1f11fa01',
                  name: 'aaatest234',
                  children: [],
                  emoji: '',
                },
              ],
              emoji: '',
            },
          ],
          emoji: '',
        },
      ],
    },
    trashTree: {},
  } as any);

  const mockClient = {} as Client;
  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getDocumentTreeTool(mockClient, mockDescriptionHelper);

  it('returns document tree as formatted JSON text', async () => {
    const result = await tool.handler({ projectIdOrKey: 'TEST_PROJECT' });
    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.projectId).toEqual(1);
    expect(result.activeTree?.children).toHaveLength(1);
    expect(result.activeTree?.children[0].children).toHaveLength(1);
  });

  it('calls getDocumentTree with correct params', async () => {
    await tool.handler({ projectIdOrKey: 'TEST_PROJECT' });

    expect(getDocumentTree).toHaveBeenCalledWith(mockClient, 'TEST_PROJECT');
  });
});
