import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';
import { getIssueAttachmentTool } from './getIssueAttachment.js';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const BMP_MAGIC = [0x42, 0x4d];
const bytesOf = (value: string) => Array.from(new TextEncoder().encode(value));

function streamOf(chunks: number[][]) {
  let index = 0;
  const cancel = vi.fn(async () => {});
  const releaseLock = vi.fn();

  return {
    body: {
      getReader: () => ({
        read: async () =>
          index < chunks.length
            ? { done: false, value: Uint8Array.from(chunks[index++]) }
            : { done: true, value: undefined },
        cancel,
        releaseLock,
      }),
    },
    cancel,
    releaseLock,
  };
}

function textOf(content: unknown) {
  const block = content as { type: string; text: string };
  expect(block.type).toBe('text');
  return block.text;
}

describe('getIssueAttachmentTool', () => {
  const getIssueAttachment = vi.fn();
  const backlog = { getIssueAttachment } as unknown as Backlog;
  const tool = getIssueAttachmentTool(backlog, createDescriptionHelper());

  beforeEach(() => {
    getIssueAttachment.mockReset();
  });

  it('returns a verified raster image as MCP image content', async () => {
    getIssueAttachment.mockResolvedValue({
      ...streamOf([PNG_MAGIC, [0x01, 0x02]]),
      filename: 'shot.png',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/7',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 7,
    });

    expect(getIssueAttachment).toHaveBeenCalledWith('PROJ-1', 7);
    expect(JSON.parse(textOf(result.content[0]))).toEqual({
      filename: 'shot.png',
      contentType: 'image/png',
      size: 10,
      attachmentId: 7,
      issueIdOrKey: 'PROJ-1',
    });
    expect(result.content[1]).toEqual({
      type: 'image',
      mimeType: 'image/png',
      data: 'iVBORw0KGgoBAg==',
    });
  });

  it('inlines a raster whose extension is wrong, under the type it really is', async () => {
    getIssueAttachment.mockResolvedValue({
      ...streamOf([PNG_MAGIC]),
      filename: 'shot.jpg',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/12',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 12,
    });

    // A PNG saved as `.jpg` is served by Backlog and has to stay renderable.
    expect(JSON.parse(textOf(result.content[0])).contentType).toBe('image/png');
    expect(result.content[1]).toMatchObject({
      type: 'image',
      mimeType: 'image/png',
    });
  });

  // Not every raster is inlinable: a client that rejects an unsupported media
  // type rejects the whole result, so BMP goes down the resource path.
  it('returns a valid BMP as a resource, not as image content', async () => {
    getIssueAttachment.mockResolvedValue({
      ...streamOf([BMP_MAGIC, [0x00, 0x00]]),
      filename: 'pic.bmp',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/13',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 13,
    });

    expect(JSON.parse(textOf(result.content[0])).contentType).toBe('image/bmp');
    expect(result.content[1]).toMatchObject({ type: 'resource' });
    expect(result.content[1]).not.toMatchObject({ type: 'image' });
  });

  it('returns a text attachment as text, not as base64', async () => {
    const csv = 'id,name\n1,foo\n';
    getIssueAttachment.mockResolvedValue({
      ...streamOf([bytesOf(csv)]),
      filename: 'data.csv',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/14',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 14,
    });

    expect(JSON.parse(textOf(result.content[0])).contentType).toBe('text/csv');
    expect(result.content[1]).toMatchObject({
      type: 'resource',
      resource: { mimeType: 'text/csv', text: csv },
    });
    // Base64 of a CSV is the same as returning nothing readable.
    expect(result.content[1]).not.toHaveProperty('resource.blob');
  });

  it('falls back to a blob when a text-typed attachment is not UTF-8', async () => {
    getIssueAttachment.mockResolvedValue({
      ...streamOf([[0xff, 0xfe, 0x00, 0x01]]),
      filename: 'notes.txt',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/15',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 15,
    });

    // Mojibake would read like a successful download.
    expect(result.content[1]).toMatchObject({
      type: 'resource',
      resource: { mimeType: 'text/plain', blob: '//4AAQ==' },
    });
    expect(result.content[1]).not.toHaveProperty('resource.text');
  });

  it('falls back to a resource when the bytes are not the image the name promises', async () => {
    getIssueAttachment.mockResolvedValue({
      ...streamOf([[0x25, 0x50, 0x44, 0x46]]),
      filename: 'not-really.png',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/8',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 8,
    });

    expect(JSON.parse(textOf(result.content[0])).contentType).toBe(
      'application/octet-stream'
    );
    expect(result.content[1]).toMatchObject({
      type: 'resource',
      resource: { mimeType: 'application/octet-stream', blob: 'JVBERg==' },
    });
  });

  // `Backlog.parseFileData` slices `Content-Disposition` at the first `''`, so
  // a header without the RFC 5987 form arrives with its first character gone,
  // and one with it arrives percent-encoded.
  it.each([
    ["UTF-8''%E5%9B%B3%E9%9D%A2.png", '図面.png'],
    ['ttachment; filename="report.png"', 'report.png'],
    ['%E5%9B%B3%E9%9D%A2.png', '図面.png'],
  ])('recovers the filename from %j', async (raw, expected) => {
    getIssueAttachment.mockResolvedValue({
      ...streamOf([PNG_MAGIC]),
      filename: raw,
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/9',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 9,
    });

    expect(JSON.parse(textOf(result.content[0])).filename).toBe(expected);
  });

  it('falls back to a synthetic name when nothing usable is left', async () => {
    getIssueAttachment.mockResolvedValue({
      ...streamOf([[0x00]]),
      filename: '',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/11',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 11,
    });

    expect(JSON.parse(textOf(result.content[0])).filename).toBe(
      'attachment-11'
    );
  });

  it("returns filename, contentType, size and base64 content with format 'base64'", async () => {
    getIssueAttachment.mockResolvedValue({
      ...streamOf([PNG_MAGIC, [0x01, 0x02]]),
      filename: 'shot.png',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/7',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 7,
      format: 'base64',
    });

    expect(result.content).toHaveLength(1);
    expect(JSON.parse(textOf(result.content[0]))).toEqual({
      filename: 'shot.png',
      contentType: 'image/png',
      size: 10,
      content: 'iVBORw0KGgoBAg==',
    });
  });

  it('never echoes the download URL, which carries the API key', async () => {
    getIssueAttachment.mockResolvedValue({
      ...streamOf([[0x00]]),
      filename: 'notes.txt',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/12?apiKey=secret',
    });

    const result = await tool.handler({
      issueKey: 'PROJ-1',
      attachmentId: 12,
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('secret');
    expect(result.content[1]).toMatchObject({
      type: 'resource',
      resource: {
        uri: 'backlog://attachments/example.backlog.com/issues/PROJ-1/attachments/12/notes.txt',
      },
    });
  });

  it('stops reading and cancels the response once the limit is passed', async () => {
    const streamed = streamOf([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    getIssueAttachment.mockResolvedValue({
      ...streamed,
      filename: 'big.bin',
      url: 'https://example.backlog.com/api/v2/issues/PROJ-1/attachments/13',
    });

    await expect(
      tool.handler({ issueKey: 'PROJ-1', attachmentId: 13, maxBytes: 4 })
    ).rejects.toThrow('exceeds the 4-byte response limit');
    expect(streamed.cancel).toHaveBeenCalled();
    expect(streamed.releaseLock).toHaveBeenCalled();
  });

  it('reports a missing issue identifier without calling Backlog', async () => {
    const result = await tool.handler({ attachmentId: 14 });

    expect(result.isError).toBe(true);
    expect(getIssueAttachment).not.toHaveBeenCalled();
  });
});
