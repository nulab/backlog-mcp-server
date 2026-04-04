import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';
import { buildAttachmentResult } from './buildAttachmentResult.js';

describe('buildAttachmentResult', () => {
  it('returns base64 as text when outputFormat is raw_base64 for images', async () => {
    const imageBuffer = Buffer.from('fake-image-data');
    const result = await buildAttachmentResult({
      body: imageBuffer,
      filename: 'photo.png',
      responseMode: 'inline',
      outputFormat: 'raw_base64',
      url: 'https://example.backlog.com/file/photo.png',
    });

    expect(result.isError).not.toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'text');
    if (result.content[0].type === 'text') {
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.base64).toBe(imageBuffer.toString('base64'));
      expect(parsed.mimeType).toBe('image/png');
      expect(parsed.filename).toBe('photo.png');
    }
  });

  it('returns base64 as text when outputFormat is raw_base64 for non-image files', async () => {
    const fileBuffer = Buffer.from('pdf-content');
    const result = await buildAttachmentResult({
      body: fileBuffer,
      filename: 'doc.pdf',
      responseMode: 'inline',
      outputFormat: 'raw_base64',
      url: 'https://example.backlog.com/file/doc.pdf',
    });

    expect(result.isError).not.toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'text');
    if (result.content[0].type === 'text') {
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.base64).toBe(fileBuffer.toString('base64'));
      expect(parsed.mimeType).toBe('application/pdf');
      expect(parsed.filename).toBe('doc.pdf');
    }
  });

  it('uses maxVideoInlineBytes for inline video attachments', async () => {
    const result = await buildAttachmentResult({
      body: Buffer.from('video-data'),
      filename: 'clip.mp4',
      responseMode: 'inline',
      maxInlineBytes: 4,
      maxVideoInlineBytes: 32,
      fallbackToMetadata: false,
      url: 'https://example.backlog.com/file/clip.mp4',
    });

    expect(result.isError).not.toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'resource');
    if (result.content[0].type === 'resource') {
      expect(result.content[0].resource.mimeType).toBe('video/mp4');
      if ('blob' in result.content[0].resource) {
        expect(result.content[0].resource.blob).toBe(
          Buffer.from('video-data').toString('base64')
        );
      }
    }
  });
});
