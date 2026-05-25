import { PassThrough } from 'stream';
import { Buffer } from 'node:buffer';
import { ReadableStream } from 'node:stream/web';
import { MaxInlineBytesExceededError } from './streamToBase64.js';

type StreamToBufferOptions = {
  maxBytes?: number;
};

function ensureWithinLimit(totalBytes: number, maxBytes?: number): void {
  if (maxBytes !== undefined && totalBytes > maxBytes) {
    throw new MaxInlineBytesExceededError(maxBytes, totalBytes);
  }
}

export async function streamToBuffer(
  stream: PassThrough | ReadableStream | unknown,
  options?: StreamToBufferOptions
): Promise<Buffer> {
  const { maxBytes } = options ?? {};

  if (
    typeof ReadableStream !== 'undefined' &&
    stream instanceof ReadableStream
  ) {
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
      ensureWithinLimit(totalBytes, maxBytes);
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  }

  if (
    stream instanceof PassThrough ||
    (stream !== null &&
      typeof stream === 'object' &&
      'on' in stream &&
      typeof (stream as { on: unknown }).on === 'function')
  ) {
    const chunks: Buffer[] = [];
    const readable = stream as PassThrough;
    let totalBytes = 0;

    return new Promise<Buffer>((resolve, reject) => {
      readable.on('data', (chunk: Buffer) => {
        const buffer = Buffer.from(chunk);
        totalBytes += buffer.length;
        try {
          ensureWithinLimit(totalBytes, maxBytes);
        } catch (error) {
          readable.destroy(error as Error);
          return;
        }
        chunks.push(buffer);
      });
      readable.on('end', () => resolve(Buffer.concat(chunks)));
      readable.on('error', reject);
    });
  }

  if (typeof stream === 'string') {
    const buffer = Buffer.from(stream);
    ensureWithinLimit(buffer.length, maxBytes);
    return buffer;
  }

  if (Buffer.isBuffer(stream)) {
    ensureWithinLimit(stream.length, maxBytes);
    return stream;
  }

  throw new Error('Unsupported body type for buffer conversion');
}
