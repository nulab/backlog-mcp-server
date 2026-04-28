import { getIssueAttachmentTool } from './getIssueAttachment.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import { PassThrough } from 'stream';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';

function createMockStream(content: string): PassThrough {
  const stream = new PassThrough();
  stream.end(content);
  return stream;
}

async function createLargePngBuffer(): Promise<Buffer> {
  const width = 1200;
  const height = 1200;
  const raw = Buffer.alloc(width * height * 3);

  for (let index = 0; index < raw.length; index++) {
    raw[index] = (index * 37) % 256;
  }

  return sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
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

  it('returns metadata only when responseMode is metadata', async () => {
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
      responseMode: 'metadata',
    });

    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content).toHaveProperty('type', 'text');
    if (content.type === 'text') {
      expect(JSON.parse(content.text)).toMatchObject({
        mode: 'metadata',
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        inlineStatus: 'skipped',
        reason: 'metadata_requested',
      });
    }
  });

  it('falls back to metadata in auto mode when attachment exceeds maxInlineBytes', async () => {
    const imageBuffer = await createLargePngBuffer();
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot.png',
        url: 'https://example.backlog.com/file/screenshot.png',
        body: imageBuffer,
      }),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      responseMode: 'auto',
      maxInlineBytes: 4,
    });

    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content).toHaveProperty('type', 'text');
    if (content.type === 'text') {
      expect(JSON.parse(content.text)).toMatchObject({
        mode: 'metadata',
        filename: 'screenshot.png',
        mimeType: 'image/png',
        inlineStatus: 'too_large',
        reason: 'attachment_exceeds_max_inline_bytes',
        maxInlineBytes: 4,
      });
    }
  });

  it('returns an error in inline mode when attachment exceeds maxInlineBytes and fallback is disabled', async () => {
    const imageBuffer = await createLargePngBuffer();
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot.png',
        url: 'https://example.backlog.com/file/screenshot.png',
        body: imageBuffer,
      }),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      responseMode: 'inline',
      maxInlineBytes: 4,
      fallbackToMetadata: false,
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content).toHaveProperty('type', 'text');
    if (content.type === 'text') {
      expect(content.text).toContain('maxInlineBytes');
    }
  });

  it('optimizes large images for inline delivery in auto mode', async () => {
    const imageBuffer = await createLargePngBuffer();
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot.png',
        url: 'https://example.backlog.com/file/screenshot.png',
        body: imageBuffer,
      }),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      responseMode: 'auto',
      maxInlineBytes: 120,
      maxImageWidth: 160,
      imageQuality: 55,
    });

    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content).toHaveProperty('type', 'image');
    expect(content).toHaveProperty('mimeType', 'image/webp');
    if (content.type === 'image') {
      expect(Buffer.from(content.data, 'base64').length).toBeLessThanOrEqual(
        120
      );
    }
  });

  it('uses maxVideoInlineBytes for inline video attachments', async () => {
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'demo.mp4',
        url: 'https://example.backlog.com/file/demo.mp4',
        body: Buffer.from('video-data'),
      }),
    };

    const tool = getIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      responseMode: 'inline',
      maxInlineBytes: 4,
      maxVideoInlineBytes: 32,
      fallbackToMetadata: false,
    });

    expect(result.isError).not.toBe(true);
    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content).toHaveProperty('type', 'resource');
    if (content.type === 'resource') {
      expect(content.resource.mimeType).toBe('video/mp4');
      if ('blob' in content.resource) {
        expect(content.resource.blob).toBe(
          Buffer.from('video-data').toString('base64')
        );
      }
    }
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
