import { getMimeType } from './getMimeType.js';
import { describe, it, expect } from 'vitest';

describe('getMimeType', () => {
  it('returns correct MIME type for common image formats', () => {
    expect(getMimeType('photo.png')).toBe('image/png');
    expect(getMimeType('photo.jpg')).toBe('image/jpeg');
    expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
    expect(getMimeType('animation.gif')).toBe('image/gif');
    expect(getMimeType('photo.webp')).toBe('image/webp');
  });

  it('returns correct MIME type for video formats', () => {
    expect(getMimeType('video.mp4')).toBe('video/mp4');
    expect(getMimeType('video.webm')).toBe('video/webm');
    expect(getMimeType('video.mov')).toBe('video/quicktime');
  });

  it('returns correct MIME type for document formats', () => {
    expect(getMimeType('doc.pdf')).toBe('application/pdf');
    expect(getMimeType('data.csv')).toBe('text/csv');
    expect(getMimeType('data.json')).toBe('application/json');
  });

  it('returns application/octet-stream for unknown extensions', () => {
    expect(getMimeType('file.xyz')).toBe('application/octet-stream');
  });

  it('returns application/octet-stream for files without extension', () => {
    expect(getMimeType('Makefile')).toBe('application/octet-stream');
  });

  it('is case insensitive for extensions', () => {
    expect(getMimeType('PHOTO.PNG')).toBe('image/png');
    expect(getMimeType('VIDEO.MP4')).toBe('video/mp4');
  });
});
