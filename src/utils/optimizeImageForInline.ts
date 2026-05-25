import { PassThrough } from 'stream';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { ReadableStream } from 'node:stream/web';
import sharp from 'sharp';
import { streamToBuffer } from './streamToBuffer.js';

const DEFAULT_MAX_IMAGE_WIDTH = 1600;
const DEFAULT_IMAGE_QUALITY = 72;
const DEFAULT_MAX_SOURCE_BYTES = 25 * 1024 * 1024;

type OptimizeImageForInlineParams = {
  body: PassThrough | ReadableStream | unknown;
  filename: string;
  maxBytes: number;
  maxImageWidth?: number;
  imageQuality?: number;
  maxSourceBytes?: number;
};

type OptimizedImageResult = {
  buffer: Buffer;
  filename: string;
  mimeType: 'image/webp';
};

function clampQuality(value: number): number {
  return Math.max(30, Math.min(90, Math.round(value)));
}

function buildWebpFilename(filename: string): string {
  const ext = path.extname(filename);
  if (!ext) return `${filename}.webp`;
  return `${filename.slice(0, -ext.length)}.webp`;
}

function qualityCandidates(initialQuality: number): number[] {
  const values = [
    initialQuality,
    initialQuality - 10,
    initialQuality - 20,
    55,
    45,
  ];
  return Array.from(
    new Set(values.map(clampQuality).filter((quality) => quality > 0))
  );
}

function widthCandidates(initialWidth: number): number[] {
  const values = [
    initialWidth,
    Math.round(initialWidth * 0.8),
    Math.round(initialWidth * 0.65),
    Math.round(initialWidth * 0.5),
  ];
  return Array.from(
    new Set(values.map((value) => Math.max(64, value)).filter(Boolean))
  );
}

export async function optimizeImageForInline({
  body,
  filename,
  maxBytes,
  maxImageWidth = DEFAULT_MAX_IMAGE_WIDTH,
  imageQuality = DEFAULT_IMAGE_QUALITY,
  maxSourceBytes = DEFAULT_MAX_SOURCE_BYTES,
}: OptimizeImageForInlineParams): Promise<OptimizedImageResult | null> {
  const source = await streamToBuffer(body, { maxBytes: maxSourceBytes });
  const widths = widthCandidates(maxImageWidth);
  const qualities = qualityCandidates(imageQuality);
  const smallestWidth = widths[widths.length - 1];
  const lowestQuality = qualities[qualities.length - 1];

  const smallestBuffer = await sharp(source)
    .rotate()
    .resize({
      width: smallestWidth,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: lowestQuality })
    .toBuffer();

  if (smallestBuffer.length > maxBytes) {
    return null;
  }

  for (const width of widths) {
    for (const quality of qualities) {
      const buffer = await sharp(source)
        .rotate()
        .resize({
          width,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      if (buffer.length <= maxBytes) {
        return {
          buffer,
          filename: buildWebpFilename(filename),
          mimeType: 'image/webp',
        };
      }
    }
  }

  return null;
}
