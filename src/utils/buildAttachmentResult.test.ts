import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';
import { buildAttachmentResult } from './buildAttachmentResult.js';

describe('buildAttachmentResult', () => {
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
