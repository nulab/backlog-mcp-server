import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import { getIssueAttachmentTool } from './getIssueAttachment.js';

function attachmentBody(bytes: number[]) {
  return new Response(Uint8Array.from(bytes).buffer).body!;
}

function chunkedAttachmentBody(chunks: number[][]) {
  let index = 0;
  const cancel = vi.fn(async () => {});
  const releaseLock = vi.fn();

  return {
    body: {
      getReader: () => ({
        read: async () =>
          index < chunks.length
            ? { done: false, value: Uint8Array.from(chunks[index++]) }
            : { done: true },
        cancel,
        releaseLock,
      }),
    },
    cancel,
    releaseLock,
  };
}

describe('getIssueAttachmentTool', () => {
  const getIssueAttachment = vi.fn();
  const backlog = { getIssueAttachment } as unknown as Backlog;
  const tool = getIssueAttachmentTool(backlog, createTranslationHelper());

  beforeEach(() => {
    getIssueAttachment.mockReset();
  });

  it('returns a non-image attachment as an embedded resource', async () => {
    const streamed = chunkedAttachmentBody([[0], [255, 128]]);
    getIssueAttachment.mockResolvedValue({
      body: streamed.body,
      filename: 'quarterly%20report.xlsx',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-123/attachments/77?apiKey=secret',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-123',
      attachmentId: 77,
    });

    expect(getIssueAttachment).toHaveBeenCalledWith('PROJ-123', 77);
    expect(result.isError).not.toBe(true);
    expect(result.content).toHaveLength(2);

    const metadata = result.content[0];
    expect(metadata.type).toBe('text');
    if (metadata.type === 'text') {
      expect(JSON.parse(metadata.text)).toEqual({
        filename: 'quarterly report.xlsx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sizeBytes: 3,
        attachmentId: 77,
        issueIdOrKey: 'PROJ-123',
      });
    }

    const resource = result.content[1];
    expect(resource.type).toBe('resource');
    if (resource.type === 'resource') {
      expect(resource.resource).toEqual({
        uri: 'backlog://attachments/example.backlog.com/issues/PROJ-123/attachments/77/quarterly%20report.xlsx',
        blob: 'AP+A',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      expect(resource.resource.uri).not.toContain('apiKey');
      expect(resource.resource.uri).not.toContain('secret');
    }
    expect(streamed.cancel).not.toHaveBeenCalled();
    expect(streamed.releaseLock).toHaveBeenCalledOnce();
  });

  it('returns supported raster images as MCP image content', async () => {
    getIssueAttachment.mockResolvedValue({
      body: attachmentBody([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      filename: 'screenshot.png',
      url: 'https://example.backlog.com/attachment',
    });

    const result = await tool.handler({ issueId: 123, attachmentId: 77 });

    expect(getIssueAttachment).toHaveBeenCalledWith(123, 77);
    expect(result.content[1]).toEqual({
      type: 'image',
      data: 'iVBORw0KGgo=',
      mimeType: 'image/png',
    });
  });

  it('returns files with an invalid image signature as binary resources', async () => {
    getIssueAttachment.mockResolvedValue({
      body: attachmentBody([1, 2, 3]),
      filename: 'not-really-an-image.png',
      url: 'https://example.backlog.com/attachment?apiKey=secret',
    });

    const result = await tool.handler({ issueId: 123, attachmentId: 77 });
    const content = result.content[1];

    expect(content.type).toBe('resource');
    if (content.type === 'resource') {
      expect(content.resource.mimeType).toBe('application/octet-stream');
    }
  });

  it('falls back to the issue key when issueId is not positive', async () => {
    getIssueAttachment.mockResolvedValue({
      body: attachmentBody([]),
      filename: 'empty.txt',
      url: 'https://example.backlog.com/attachment',
    });

    await tool.handler({ issueId: 0, issueKey: 'PROJ-123', attachmentId: 77 });

    expect(getIssueAttachment).toHaveBeenCalledWith('PROJ-123', 77);
  });

  it('returns an MCP error when neither issueId nor issueKey is provided', async () => {
    const result = await tool.handler({ attachmentId: 77 });

    expect(result).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Issue ID or key is required' }],
    });
    expect(getIssueAttachment).not.toHaveBeenCalled();
  });

  it.each([
    ['..%2Fsecret.txt', 'secret.txt'],
    ['bad%ZZ.txt', 'bad%ZZ.txt'],
    ['ttachment;filename="plain-name.pdf"', 'plain-name.pdf'],
    ['.', 'attachment-77'],
    ['..', 'attachment-77'],
    ['', 'attachment-77'],
  ])('normalizes the filename %j to %j', async (rawName, expectedName) => {
    getIssueAttachment.mockResolvedValue({
      body: attachmentBody([1]),
      filename: rawName,
      url: 'https://example.backlog.com/attachment',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-123',
      attachmentId: 77,
    });
    const metadata = result.content[0];

    expect(metadata.type).toBe('text');
    if (metadata.type === 'text') {
      expect(JSON.parse(metadata.text).filename).toBe(expectedName);
    }
  });

  it('returns an MCP error when the attachment exceeds maxBytes', async () => {
    const streamed = chunkedAttachmentBody([
      [1, 2],
      [3, 4],
    ]);
    getIssueAttachment.mockResolvedValue({
      body: streamed.body,
      filename: 'large.bin',
      url: 'https://example.backlog.com/attachment',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-123',
      attachmentId: 77,
      maxBytes: 3,
    });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Attachment exceeds the 3-byte response limit.',
        },
      ],
    });
    expect(streamed.cancel).toHaveBeenCalledOnce();
    expect(streamed.releaseLock).toHaveBeenCalledOnce();
  });

  it('redacts Backlog response URLs from errors', async () => {
    getIssueAttachment.mockRejectedValue({
      _name: 'UnexpectedError',
      _status: 502,
      _url: 'https://example.backlog.com/api/v2/issues/PROJ-123/attachments/77?apiKey=TOP_SECRET',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-123',
      attachmentId: 77,
    });
    const content = result.content[0];

    expect(result.isError).toBe(true);
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('[Backlog URL redacted]');
      expect(content.text).not.toContain('TOP_SECRET');
      expect(content.text).not.toContain('example.backlog.com');
    }
  });

  it('namespaces resource URIs by Backlog host', async () => {
    getIssueAttachment
      .mockResolvedValueOnce({
        body: attachmentBody([1]),
        filename: 'file.bin',
        url: 'https://team-a.backlog.com/attachment?apiKey=secret-a',
      })
      .mockResolvedValueOnce({
        body: attachmentBody([1]),
        filename: 'file.bin',
        url: 'https://team-b.backlog.com/attachment?apiKey=secret-b',
      });

    const first = await tool.handler({
      issueKey: 'PROJ-123',
      attachmentId: 77,
    });
    const second = await tool.handler({
      issueKey: 'PROJ-123',
      attachmentId: 77,
    });
    const firstResource = first.content[1];
    const secondResource = second.content[1];

    expect(firstResource.type).toBe('resource');
    expect(secondResource.type).toBe('resource');
    if (
      firstResource.type === 'resource' &&
      secondResource.type === 'resource'
    ) {
      expect(firstResource.resource.uri).not.toBe(secondResource.resource.uri);
      expect(firstResource.resource.uri).toContain('team-a.backlog.com');
      expect(secondResource.resource.uri).toContain('team-b.backlog.com');
    }
  });

  it('returns an MCP error for an unsupported response body', async () => {
    getIssueAttachment.mockResolvedValue({
      body: {},
      filename: 'broken.bin',
      url: 'https://example.backlog.com/attachment',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-123',
      attachmentId: 77,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'Backlog returned an unsupported attachment body.',
    });
  });

  it('validates attachmentId and maxBytes as positive bounded integers', () => {
    expect(
      tool.schema.safeParse({ issueKey: 'PROJ-123', attachmentId: 0 }).success
    ).toBe(false);
    expect(
      tool.schema.safeParse({
        issueKey: 'PROJ-123',
        attachmentId: 77,
        maxBytes: 7 * 1024 * 1024 + 1,
      }).success
    ).toBe(false);
  });
});
