import { getWikiAttachmentTool } from './getWikiAttachment.js';
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

describe('getWikiAttachmentTool', () => {
  const mockTranslationHelper = createTranslationHelper();

  it('returns image content for image attachments', async () => {
    const mockBacklog: Partial<Backlog> = {
      getWikiAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'diagram.png',
        url: 'https://example.backlog.com/file/diagram.png',
        body: createMockStream('fake-image-data'),
      }),
    };

    const tool = getWikiAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({ wikiId: 10, attachmentId: 200 });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'image');
    expect(result.content[0]).toHaveProperty('mimeType', 'image/png');
  });

  it('returns resource content for non-image attachments', async () => {
    const mockBacklog: Partial<Backlog> = {
      getWikiAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'notes.txt',
        url: 'https://example.backlog.com/file/notes.txt',
        body: createMockStream('text content'),
      }),
    };

    const tool = getWikiAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({ wikiId: 10, attachmentId: 201 });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'resource');
  });

  it('returns metadata for non-image attachments in auto mode', async () => {
    const mockBacklog: Partial<Backlog> = {
      getWikiAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'notes.txt',
        url: 'https://example.backlog.com/file/notes.txt',
        body: createMockStream('text content'),
      }),
    };

    const tool = getWikiAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      wikiId: 10,
      attachmentId: 201,
      responseMode: 'auto',
    });

    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content).toHaveProperty('type', 'text');
    if (content.type === 'text') {
      expect(JSON.parse(content.text)).toMatchObject({
        mode: 'metadata',
        filename: 'notes.txt',
        mimeType: 'text/plain',
        inlineStatus: 'skipped',
        reason: 'non_image_attachment',
      });
    }
  });

  it('uses maxVideoInlineBytes for inline wiki video attachments', async () => {
    const mockBacklog: Partial<Backlog> = {
      getWikiAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'demo.mp4',
        url: 'https://example.backlog.com/file/demo.mp4',
        body: Buffer.from('video-data'),
      }),
    };

    const tool = getWikiAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      wikiId: 10,
      attachmentId: 201,
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

  it('decodes URL-encoded filename (dot encoded) when determining MIME type', async () => {
    const mockBacklog: Partial<Backlog> = {
      getWikiAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'diagram%2Epng',
        url: 'https://example.backlog.com/file/diagram.png',
        body: createMockStream('fake-image-data'),
      }),
    };

    const tool = getWikiAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({ wikiId: 10, attachmentId: 200 });
    expect(result.content[0]).toHaveProperty('type', 'image');
    expect(result.content[0]).toHaveProperty('mimeType', 'image/png');
  });

  it('does not throw when filename contains malformed percent-encoding', async () => {
    const mockBacklog: Partial<Backlog> = {
      getWikiAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'file%GGname.png',
        url: 'https://example.backlog.com/file/filename.png',
        body: createMockStream('fake-image-data'),
      }),
    };

    const tool = getWikiAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({ wikiId: 10, attachmentId: 200 });
    expect(result.content[0]).toHaveProperty('type', 'image');
  });

  it('calls backlog.getWikiAttachment with correct params', async () => {
    const mockBacklog: Partial<Backlog> = {
      getWikiAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'test.png',
        url: 'https://example.backlog.com/file/test.png',
        body: createMockStream('data'),
      }),
    };

    const tool = getWikiAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await tool.handler({ wikiId: 10, attachmentId: 200 });
    expect(mockBacklog.getWikiAttachment).toHaveBeenCalledWith(10, 200);
  });
});
