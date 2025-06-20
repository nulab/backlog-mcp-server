import { getIssueTypesTool } from './getIssueTypes.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getIssueTypesTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getIssueTypes: jest.fn<() => Promise<any>>().mockResolvedValue([
      {
        id: 1,
        projectId: 100,
        name: 'Bug',
        color: '#990000',
      },
      {
        id: 2,
        projectId: 100,
        name: 'Task',
        color: '#7ea800',
      },
      {
        id: 3,
        projectId: 100,
        name: 'Request',
        color: '#ff9200',
      },
    ]),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getIssueTypesTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns issue types list as formatted JSON text', async () => {
    const result = await tool.handler({
      projectKey: 'TEST',
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }
    expect(result).toHaveLength(3);
    expect(result[0].name).toContain('Bug');
    expect(result[1].name).toContain('Task');
    expect(result[2].name).toContain('Request');
  });

  it('calls backlog.getIssueTypes with correct params when using project key', async () => {
    await tool.handler({
      projectKey: 'TEST',
    });

    expect(mockBacklog.getIssueTypes).toHaveBeenCalledWith('TEST');
  });

  it('calls backlog.getIssueTypes with correct params when using project ID', async () => {
    await tool.handler({
      projectId: 100,
    });

    expect(mockBacklog.getIssueTypes).toHaveBeenCalledWith(100);
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(tool.handler(params as any)).rejects.toThrow(Error);
  });
});
