import { getIssueAttachmentTool } from './getIssueAttachment.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import { PassThrough } from 'stream';
import { Buffer } from 'node:buffer';

function createMockStream(content: string): PassThrough {
  const stream = new PassThrough();
  stream.end(content);
  return stream;
}

describe('getIssueAttachmentTool', () => {
  const mockTranslationHelper = createTranslationHelper();

  it('returns image content for image attachments', async () => {
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot.png',
        url: 'https://example.backlog.com/file/screenshot.png',
        body: createMockStream('fake-png-data'),
      }),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'image');
    expect(result.content[0]).toHaveProperty('mimeType', 'image/png');
    expect(result.content[0]).toHaveProperty(
      'data',
      Buffer.from('fake-png-data').toString('base64')
    );
  });

  it('returns resource content for non-image attachments', async () => {
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'document.pdf',
        url: 'https://example.backlog.com/file/document.pdf',
        body: createMockStream('fake-pdf-data'),
      }),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 101,
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'resource');
  });

  it('calls backlog.getIssueAttachment with correct params', async () => {
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'test.png',
        url: 'https://example.backlog.com/file/test.png',
        body: createMockStream('data'),
      }),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await tool.handler({ issueId: 42, attachmentId: 100 });
    expect(mockBacklog.getIssueAttachment).toHaveBeenCalledWith(42, 100);
  });

  it('decodes URL-encoded filename (dot encoded) when determining MIME type', async () => {
    // backlog-js extracts filename from Content-Disposition header via RFC 5987.
    // In rare cases the dot may be percent-encoded: "screenshot%2Epng"
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot%2Epng',
        url: 'https://example.backlog.com/file/screenshot.png',
        body: createMockStream('fake-png-data'),
      }),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
    });
    expect(result.content[0]).toHaveProperty('type', 'image');
    expect(result.content[0]).toHaveProperty('mimeType', 'image/png');
  });

  it('does not throw when filename contains malformed percent-encoding', async () => {
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'file%GGname.png',
        url: 'https://example.backlog.com/file/filename.png',
        body: createMockStream('fake-png-data'),
      }),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    // Should not throw — falls back to raw filename, still detects .png
    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
    });
    expect(result.content[0]).toHaveProperty('type', 'image');
  });

  it('returns error if neither issueId nor issueKey is provided', async () => {
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn(),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({ attachmentId: 100 });
    expect(result.isError).toBe(true);
  });
});
