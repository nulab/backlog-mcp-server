import { PassThrough } from 'stream';
import { Buffer } from 'node:buffer';

export async function streamToBase64(
  stream: PassThrough | ReadableStream | unknown
): Promise<string> {
  if (
    typeof ReadableStream !== 'undefined' &&
    stream instanceof ReadableStream
  ) {
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Uint8Array(totalLength);
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

    return new Promise<string>((resolve, reject) => {
      readable.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      readable.on('end', () =>
        resolve(Buffer.concat(chunks).toString('base64'))
      );
      readable.on('error', reject);
    });
  }

  if (typeof stream === 'string') {
    return Buffer.from(stream).toString('base64');
  }

  throw new Error('Unsupported body type for base64 conversion');
}
