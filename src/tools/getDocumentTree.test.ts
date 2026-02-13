import { getDocumentTreeTool } from './getDocumentTree.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
// export const DocumentTreeFullSchema = z.object({
//   projectId: z.string(),
//   activeTree: ActiveTrashTreeSchema.optional(),
//   trashTree: ActiveTrashTreeSchema.optional(),
// });
describe('getDocumentTreeTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getDocumentTree: vi.fn<() => Promise<any>>().mockResolvedValue({
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
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getDocumentTreeTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns document tree as formatted JSON text', async () => {
    const result = await tool.handler({ projectIdOrKey: 'TEST_PROJECT' });
    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.projectId).toEqual(1);
    expect(result.activeTree?.children).toHaveLength(1);
    expect(result.activeTree?.children[0].children).toHaveLength(1);
  });

  it('calls backlog.getDocumentTree with correct params', async () => {
    await tool.handler({ projectIdOrKey: 'TEST_PROJECT' });

    expect(mockBacklog.getDocumentTree).toHaveBeenCalledWith('TEST_PROJECT');
  });
});
