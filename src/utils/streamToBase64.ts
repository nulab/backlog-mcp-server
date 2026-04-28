import { PassThrough } from 'stream';
import { ReadableStream } from 'node:stream/web';
import { Buffer } from 'node:buffer';

export class MaxInlineBytesExceededError extends Error {
  constructor(
    public readonly maxInlineBytes: number,
    public readonly actualBytes: number
  ) {
    super(
      `Attachment size ${actualBytes} bytes exceeds maxInlineBytes ${maxInlineBytes}`
    );
    this.name = 'MaxInlineBytesExceededError';
  }
}

type StreamToBase64Options = {
  maxBytes?: number;
};

function ensureWithinLimit(
  totalBytes: number,
  maxBytes?: number
): asserts totalBytes is number {
  if (maxBytes !== undefined && totalBytes > maxBytes) {
    throw new MaxInlineBytesExceededError(maxBytes, totalBytes);
  }
}

export async function streamToBase64(
  stream: PassThrough | ReadableStream | unknown,
  options?: StreamToBase64Options
): Promise<string> {
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
    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return Buffer.from(merged).toString('base64');
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

    return new Promise<string>((resolve, reject) => {
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
      readable.on('end', () =>
        resolve(Buffer.concat(chunks).toString('base64'))
      );
      readable.on('error', reject);
    });
  }

  if (typeof stream === 'string') {
    ensureWithinLimit(Buffer.byteLength(stream), maxBytes);
    return Buffer.from(stream).toString('base64');
  }

  if (Buffer.isBuffer(stream)) {
    ensureWithinLimit(stream.length, maxBytes);
    return stream.toString('base64');
  }

  throw new Error('Unsupported body type for base64 conversion');
}
