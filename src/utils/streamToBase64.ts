import { PassThrough } from 'stream';
import { Buffer } from 'node:buffer';

export async function streamToBase64(
  stream: PassThrough | unknown
): Promise<string> {
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
