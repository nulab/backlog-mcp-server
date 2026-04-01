import { getPullRequestAttachmentTool } from './getPullRequestAttachment.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import { PassThrough } from 'stream';

function createMockStream(content: string): PassThrough {
  const stream = new PassThrough();
  stream.end(content);
  return stream;
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
      repoIdOrName: 'my-repo',
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
      repoIdOrName: 'my-repo',
      number: 1,
      attachmentId: 301,
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'resource');
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
      repoIdOrName: 'my-repo',
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
      repoIdOrName: 'my-repo',
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
      repoIdOrName: 'my-repo',
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
      repoIdOrName: 'my-repo',
      number: 1,
      attachmentId: 300,
    });

    expect(result.isError).toBe(true);
  });
});
