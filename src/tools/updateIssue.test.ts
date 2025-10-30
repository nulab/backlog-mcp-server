import { updateIssueTool } from './updateIssue.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('updateIssueTool', () => {
  const mockBacklog: Partial<Backlog> = {
    patchIssue: jest.fn<() => Promise<any>>().mockResolvedValue({
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
      summary: 'Updated Issue',
      description: 'This is an updated issue',
      priority: {
        id: 2,
        name: 'High',
      },
      status: {
        id: 2,
        name: 'In Progress',
        projectId: 100,
        color: '#ff9900',
        displayOrder: 1,
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
      estimatedHours: 15,
      actualHours: 8,
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
      updated: '2023-01-02T00:00:00Z',
    }),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = updateIssueTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns updated issue', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
      summary: 'Updated Issue',
      description: 'This is an updated issue',
    });

    expect(result).toHaveProperty('summary', 'Updated Issue');
    expect(result).toHaveProperty('description', 'This is an updated issue');
    expect(result).toHaveProperty('issueKey', 'TEST-1');
  });

  it('calls backlog.patchIssue with correct params when using issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      summary: 'Updated Issue',
      priorityId: 2,
      statusId: 2,
    });

    expect(mockBacklog.patchIssue).toHaveBeenCalledWith('TEST-1', {
      priorityId: 2,
      statusId: 2,
      summary: 'Updated Issue',
    });
  });

  it('calls backlog.patchIssue with correct params when using issue ID', async () => {
    await tool.handler({
      issueId: 1,
      estimatedHours: 15,
      actualHours: 8,
      comment: 'Updated the estimated and actual hours',
    });

    expect(mockBacklog.patchIssue).toHaveBeenCalledWith(1, {
      // Expect number
      estimatedHours: 15,
      actualHours: 8,
      comment: 'Updated the estimated and actual hours',
    });
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });

  it('transforms customFields to proper customField_{id} format', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      summary: 'Custom Field Test',
      issueTypeId: 2,
      priorityId: 3,
      customFields: [
        { id: 123, value: 987 },
        { id: 456, value: 42 },
        { id: 789, value: [11, 22], otherValue: '詳細説明' },
      ],
    });

    expect(mockBacklog.patchIssue).toHaveBeenCalledWith(
      'TEST-1',
      expect.objectContaining({
        summary: 'Custom Field Test',
        issueTypeId: 2,
        priorityId: 3,
        customField_123: 987,
        customField_456: 42,
        customField_789: [11, 22],
        customField_789_otherValue: '詳細説明',
      })
    );
  });

  it('transforms multi-select customFields with numeric IDs during update', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      customFields: [{ id: 555, value: [11, 22] }],
    });

    expect(mockBacklog.patchIssue).toHaveBeenCalledWith(
      'TEST-1',
      expect.objectContaining({
        customField_555: [11, 22],
      })
    );
  });

  it('transforms customFields that provide only otherValue during update', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
      customFields: [{ id: 888, otherValue: '補足情報' }],
    });

    expect(mockBacklog.patchIssue).toHaveBeenCalledWith(
      'TEST-1',
      expect.objectContaining({
        customField_888_otherValue: '補足情報',
      })
    );
  });
});
