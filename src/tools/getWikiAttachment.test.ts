import { getWikiAttachmentTool } from './getWikiAttachment.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import { PassThrough } from 'stream';

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
