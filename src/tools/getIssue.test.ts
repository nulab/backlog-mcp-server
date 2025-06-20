import { getIssueTool } from './getIssue.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getIssueTool', () => {
  const mockBacklog: Partial<Backlog> = {
    getIssue: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: 1,
      projectId: 100,
      issueKey: 'TEST-1',
      keyId: 1,
      issueType: {
        id: 2,
        projectId: 100,
        name: 'Bug',
        color: '#990000',
        displayOrder: 0,
      },
      summary: 'Test Issue',
      description: 'This is a test issue',
      priority: {
        id: 3,
        name: 'Normal',
      },
      status: {
        id: 1,
        name: 'Open',
        projectId: 100,
        color: '#ff0000',
        displayOrder: 0,
      },
      assignee: {
        id: 5,
        userId: 'user',
        name: 'Test User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'test@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      startDate: '2023-01-01',
      dueDate: '2023-01-31',
      estimatedHours: 10,
      actualHours: 5,
      createdUser: {
        id: 1,
        userId: 'admin',
        name: 'Admin User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'admin@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      created: '2023-01-01T00:00:00Z',
      updatedUser: {
        id: 1,
        userId: 'admin',
        name: 'Admin User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'admin@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      updated: '2023-01-01T00:00:00Z',
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getIssueTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns issue information as formatted JSON text', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }
    expect(result.summary).toEqual('Test Issue');
    expect(result.description).toEqual('This is a test issue');
  });

  it('calls backlog.getIssue with correct params when using issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
    });

    expect(mockBacklog.getIssue).toHaveBeenCalledWith('TEST-1');
  });

  it('calls backlog.getIssue with correct params when using issue ID', async () => {
    await tool.handler({
      issueId: 1,
    });

    expect(mockBacklog.getIssue).toHaveBeenCalledWith(1); // Expect number
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });
});
