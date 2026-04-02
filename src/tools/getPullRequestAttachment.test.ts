import { getPullRequestAttachmentTool } from './getPullRequestAttachment.js';
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

describe('getPullRequestAttachmentTool', () => {
  const mockTranslationHelper = createTranslationHelper();

  it('returns image content for image attachments', async () => {
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot.jpg',
        url: 'https://example.backlog.com/file/screenshot.jpg',
        body: createMockStream('fake-jpg-data'),
      }),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      projectKey: 'PROJ',
      repoName: 'my-repo',
      number: 1,
      attachmentId: 300,
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'image');
    expect(result.content[0]).toHaveProperty('mimeType', 'image/jpeg');
  });

  it('returns resource content for non-image attachments', async () => {
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'report.csv',
        url: 'https://example.backlog.com/file/report.csv',
        body: createMockStream('csv-data'),
      }),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      projectKey: 'PROJ',
      repoName: 'my-repo',
      number: 1,
      attachmentId: 301,
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'resource');
  });

  it('falls back to metadata in auto mode when pull request attachment exceeds maxInlineBytes', async () => {
    const imageBuffer = await createLargePngBuffer();
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot.jpg',
        url: 'https://example.backlog.com/file/screenshot.jpg',
        body: imageBuffer,
      }),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      projectKey: 'PROJ',
      repoName: 'my-repo',
      number: 1,
      attachmentId: 300,
      responseMode: 'auto',
      maxInlineBytes: 4,
    });

    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content).toHaveProperty('type', 'text');
    if (content.type === 'text') {
      expect(JSON.parse(content.text)).toMatchObject({
        mode: 'metadata',
        filename: 'screenshot.jpg',
        mimeType: 'image/jpeg',
        inlineStatus: 'too_large',
        reason: 'attachment_exceeds_max_inline_bytes',
        maxInlineBytes: 4,
      });
    }
  });

  it('uses maxVideoInlineBytes for inline pull request video attachments', async () => {
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'demo.mp4',
        url: 'https://example.backlog.com/file/demo.mp4',
        body: Buffer.from('video-data'),
      }),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      projectKey: 'PROJ',
      repoName: 'my-repo',
      number: 1,
      attachmentId: 300,
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

  it('calls backlog.getPullRequestAttachment with correct params', async () => {
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'test.png',
        url: 'https://example.backlog.com/file/test.png',
        body: createMockStream('data'),
      }),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await tool.handler({
      projectId: 5,
      repoName: 'my-repo',
      number: 1,
      attachmentId: 300,
    });

    expect(mockBacklog.getPullRequestAttachment).toHaveBeenCalledWith(
      5,
      'my-repo',
      1,
      300
    );
  });

  it('decodes URL-encoded filename (dot encoded) when determining MIME type', async () => {
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot%2Ejpg',
        url: 'https://example.backlog.com/file/screenshot.jpg',
        body: createMockStream('fake-jpg-data'),
      }),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      projectKey: 'PROJ',
      repoName: 'my-repo',
      number: 1,
      attachmentId: 300,
    });
    expect(result.content[0]).toHaveProperty('type', 'image');
    expect(result.content[0]).toHaveProperty('mimeType', 'image/jpeg');
  });

  it('does not throw when filename contains malformed percent-encoding', async () => {
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'file%GGname.png',
        url: 'https://example.backlog.com/file/filename.png',
        body: createMockStream('fake-png-data'),
      }),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      projectKey: 'PROJ',
      repoName: 'my-repo',
      number: 1,
      attachmentId: 300,
    });
    expect(result.content[0]).toHaveProperty('type', 'image');
  });

  it('returns error if neither projectId nor projectKey is provided', async () => {
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn(),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      repoName: 'my-repo',
      number: 1,
      attachmentId: 300,
    });

    expect(result.isError).toBe(true);
  });

  it('accepts repoId as an alternative to repoName', async () => {
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'test.png',
        url: 'https://example.backlog.com/file/test.png',
        body: createMockStream('data'),
      }),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await tool.handler({
      projectId: 5,
      repoId: 99,
      number: 1,
      attachmentId: 300,
    });

    expect(mockBacklog.getPullRequestAttachment).toHaveBeenCalledWith(
      5,
      '99',
      1,
      300
    );
  });

  it('returns error if neither repoId nor repoName is provided', async () => {
    const mockBacklog: Partial<Backlog> = {
      getPullRequestAttachment: vi.fn(),
    };

    const tool = getPullRequestAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      projectKey: 'PROJ',
      number: 1,
      attachmentId: 300,
    });

    expect(result.isError).toBe(true);
  });
});
