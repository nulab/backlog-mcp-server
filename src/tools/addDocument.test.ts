import { addDocumentTool } from './addDocument.js';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  type MockedFunction,
} from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('addDocumentTool', () => {
  let mockAddDocument: MockedFunction<() => Promise<any>>;
  let mockBacklog: Partial<Backlog>;

  beforeEach(() => {
    mockAddDocument = vi.fn<() => Promise<any>>().mockResolvedValue({
      id: '1',
      projectId: 100,
      title: 'Test Document',
      plain: 'This is a test document',
      json: '{}',
      statusId: 1,
      emoji: null,
      attachments: [],
      tags: [],
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
    });

    mockBacklog = {
      addDocument: mockAddDocument,
    };
  });

  const mockTranslationHelper = createTranslationHelper();

  it('returns created document with all important fields', async () => {
    const tool = addDocumentTool(mockBacklog as Backlog, mockTranslationHelper);
    const result = await tool.handler({
      projectId: 100,
      title: 'Test Document',
      content: 'This is a test document',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.id).toBe('1');
    expect(result.projectId).toBe(100);
    expect(result.title).toBe('Test Document');
    expect(result.plain).toBe('This is a test document');
    expect(result.createdUser).toBeDefined();
    expect(result.createdUser.userId).toBe('admin');
  });

  it('calls backlog.addDocument with correct basic params', async () => {
    const tool = addDocumentTool(mockBacklog as Backlog, mockTranslationHelper);
    await tool.handler({
      projectId: 100,
      title: 'Test Document',
      content: 'This is a test document',
    });

    expect(mockAddDocument).toHaveBeenCalledWith({
      projectId: 100,
      title: 'Test Document',
      content: 'This is a test document',
    });
  });

  it('calls backlog.addDocument with all optional params', async () => {
    const tool = addDocumentTool(mockBacklog as Backlog, mockTranslationHelper);
    await tool.handler({
      projectId: 100,
      title: 'Document with options',
      content: 'Content with all options',
      emoji: '📝',
      parentId: '5',
      addLast: true,
    });

    expect(mockAddDocument).toHaveBeenCalledWith({
      projectId: 100,
      title: 'Document with options',
      content: 'Content with all options',
      emoji: '📝',
      parentId: '5',
      addLast: true,
    });
  });

  it('calls backlog.addDocument with minimum required params only', async () => {
    const tool = addDocumentTool(mockBacklog as Backlog, mockTranslationHelper);
    await tool.handler({
      projectId: 100,
    });

    expect(mockAddDocument).toHaveBeenCalledWith({
      projectId: 100,
    });
  });

  it('calls backlog.addDocument with emoji only', async () => {
    const tool = addDocumentTool(mockBacklog as Backlog, mockTranslationHelper);
    mockAddDocument.mockResolvedValueOnce({
      id: '2',
      projectId: 100,
      title: '',
      plain: '',
      json: '{}',
      statusId: 1,
      emoji: '🎉',
      attachments: [],
      tags: [],
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
    });

    const result = await tool.handler({
      projectId: 100,
      emoji: '🎉',
    });

    if (Array.isArray(result)) {
      throw new Error('Unexpected array result');
    }

    expect(result.emoji).toBe('🎉');
    expect(mockAddDocument).toHaveBeenCalledWith({
      projectId: 100,
      emoji: '🎉',
    });
  });

  it('calls backlog.addDocument with parentId and addLast', async () => {
    const tool = addDocumentTool(mockBacklog as Backlog, mockTranslationHelper);
    await tool.handler({
      projectId: 100,
      title: 'Child Document',
      parentId: '10',
      addLast: false,
    });

    expect(mockAddDocument).toHaveBeenCalledWith({
      projectId: 100,
      title: 'Child Document',
      parentId: '10',
      addLast: false,
    });
  });

  it('throws error when API fails', async () => {
    const tool = addDocumentTool(mockBacklog as Backlog, mockTranslationHelper);
    const apiError = new Error('API Error: Project not found');
    mockAddDocument.mockRejectedValueOnce(apiError);

    await expect(
      tool.handler({
        projectId: 999,
        title: 'Invalid Project',
      })
    ).rejects.toThrow('API Error: Project not found');
  });
});
