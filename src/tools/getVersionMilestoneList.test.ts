import { getVersionMilestoneListTool } from './getVersionMilestoneList.js';
import { vi, describe, it, expect } from 'vite-plus/test';
import { getVersions } from 'backlog-js';
import type { Client } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getVersions: vi.fn(),
}));

describe('getVersionMilestoneTool', () => {
  vi.mocked(getVersions).mockResolvedValue([
    {
      id: 1,
      projectId: 1,
      name: 'wait for release',
      description: '',
      startDate: null,
      releaseDueDate: null,
      archived: false,
      displayOrder: 0,
    },
    {
      id: 2,
      projectId: 1,
      name: 'v1.0.0',
      description: 'First release',
      startDate: '2025-01-01',
      releaseDueDate: '2025-03-01',
      archived: false,
      displayOrder: 1,
    },
    {
      id: 3,
      projectId: 1,
      name: 'v1.1.0',
      description: 'Minor update',
      startDate: '2025-03-01',
      releaseDueDate: '2025-05-01',
      archived: false,
      displayOrder: 2,
    },
  ] as any);

  const mockClient = {} as Client;

  const mockDescriptionHelper = createDescriptionHelper();
  const tool = getVersionMilestoneListTool(mockClient, mockDescriptionHelper);

  it('returns versions list as formatted JSON text', async () => {
    const result = await tool.handler({ projectId: 123 });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(3);
    expect(result[0].name).toContain('wait for release');
    expect(result[1].name).toContain('v1.0.0');
    expect(result[2].name).toContain('v1.1.0');
  });

  it('calls getVersions with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST_PROJECT',
    });

    expect(getVersions).toHaveBeenCalledWith(mockClient, 'TEST_PROJECT');
  });

  it('calls getVersions with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 123,
    });

    expect(getVersions).toHaveBeenCalledWith(mockClient, 123);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
