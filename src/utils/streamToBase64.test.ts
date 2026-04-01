import { streamToBase64 } from './streamToBase64.js';
import { describe, it, expect } from 'vitest';
import { PassThrough } from 'stream';
import { Buffer } from 'node:buffer';

describe('streamToBase64', () => {
  it('converts a PassThrough stream to base64', async () => {
    const stream = new PassThrough();
    const content = 'hello world';
    stream.end(content);

    const result = await streamToBase64(stream);
    expect(result).toBe(Buffer.from(content).toString('base64'));
  });

  it('converts a string to base64', async () => {
    const result = await streamToBase64('plain text');
    expect(result).toBe(Buffer.from('plain text').toString('base64'));
  });

  it('converts a ReadableStream to base64', async () => {
    const content = 'hello from readable stream';
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(content));
        controller.close();
      },
    });

    const result = await streamToBase64(stream);
    expect(result).toBe(Buffer.from(content).toString('base64'));
  });

  it('converts a ReadableStream with multiple chunks to base64', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('chunk1'));
        controller.enqueue(encoder.encode('chunk2'));
        controller.close();
      },
    });

    const result = await streamToBase64(stream);
    expect(result).toBe(Buffer.from('chunk1chunk2').toString('base64'));
  });

  it('throws for unsupported types', async () => {
    await expect(streamToBase64(12345)).rejects.toThrow(
      'Unsupported body type'
    );
  });
});
