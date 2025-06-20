import { addIssueTool } from './addIssue.js';
import { jest, describe, it, expect } from '@jest/globals';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('addIssueTool', () => {
  const mockBacklog: Partial<Backlog> = {
    postIssue: jest.fn<() => Promise<any>>().mockResolvedValue({
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
  const tool = addIssueTool(mockBacklog as Backlog, mockTranslationHelper);

  it('returns created issue as formatted JSON text', async () => {
    const result = await tool.handler({
      projectId: 100,
      summary: 'Test Issue',
      issueTypeId: 2,
      priorityId: 3,
      description: 'This is a test issue',
      startDate: '2023-01-01',
      dueDate: '2023-01-31',
      estimatedHours: 10,
      actualHours: 5,
    });
    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.summary).toContain('Test Issue');
    expect(result.description).toContain('This is a test issue');
  });

  it('calls backlog.postIssue with correct params', async () => {
    await tool.handler({
      projectId: 100,
      summary: 'Test Issue',
      issueTypeId: 2,
      priorityId: 3,
      description: 'This is a test issue',
      startDate: '2023-01-01',
      dueDate: '2023-01-31',
      estimatedHours: 10,
      actualHours: 5,
    });

    expect(mockBacklog.postIssue).toHaveBeenCalledWith({
      projectId: 100,
      summary: 'Test Issue',
      issueTypeId: 2,
      priorityId: 3,
      description: 'This is a test issue',
      startDate: '2023-01-01',
      dueDate: '2023-01-31',
      estimatedHours: 10,
      actualHours: 5,
    });
  });

  it('transforms customFields to proper customField_{id} format', async () => {
    await tool.handler({
      projectId: 100,
      summary: 'Custom Field Test',
      issueTypeId: 2,
      priorityId: 3,
      customFields: [
        { id: 123, value: 'テキスト' },
        { id: 456, value: 42 },
        { id: 789, value: ['OptionA', 'OptionB'], otherValue: '詳細説明' },
      ],
    });

    expect(mockBacklog.postIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 100,
        summary: 'Custom Field Test',
        issueTypeId: 2,
        priorityId: 3,
        customField_123: 'テキスト',
        customField_456: 42,
        customField_789: ['OptionA', 'OptionB'],
        customField_789_otherValue: '詳細説明',
      })
    );
  });
});
