import { postSpaceAttachmentTool } from './postSpaceAttachment.js';
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import { Buffer } from 'node:buffer';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('postSpaceAttachmentTool', () => {
  const mockPostSpaceAttachment = vi
    .fn<(form: FormData) => Promise<any>>()
    .mockResolvedValue({
      id: 1,
      name: 'screenshot.png',
      size: 12345,
    });

  const mockBacklog: Partial<Backlog> = {
    postSpaceAttachment: mockPostSpaceAttachment,
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = postSpaceAttachmentTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  beforeEach(() => {
    mockPostSpaceAttachment.mockClear();
  });

  describe('with fileContent (base64)', () => {
    it('returns uploaded file info', async () => {
      const result = await tool.handler({
        fileName: 'screenshot.png',
        fileContent: 'aGVsbG8=', // "hello" in base64
      });

      if (Array.isArray(result)) {
        throw new Error('Unexpected array result');
      }

      expect(result.id).toBe(1);
      expect(result.name).toBe('screenshot.png');
      expect(result.size).toBe(12345);
    });

    it('calls backlog.postSpaceAttachment with FormData containing the file', async () => {
      await tool.handler({
        fileName: 'test.txt',
        fileContent: 'dGVzdA==', // "test" in base64
      });

      expect(mockPostSpaceAttachment).toHaveBeenCalledTimes(1);
      const form = mockPostSpaceAttachment.mock.calls[0][0] as FormData;
      expect(form).toBeInstanceOf(FormData);
      const file = form.get('file') as File;
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('test.txt');
    });

    it('correctly decodes base64 content', async () => {
      await tool.handler({
        fileName: 'data.bin',
        fileContent: 'AQID', // [1, 2, 3] in base64
      });

      const form = mockPostSpaceAttachment.mock.calls[0][0] as FormData;
      const file = form.get('file') as File;
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      expect(Array.from(bytes)).toEqual([1, 2, 3]);
    });

    it('throws if fileName is missing with fileContent', async () => {
      await expect(tool.handler({ fileContent: 'aGVsbG8=' })).rejects.toThrow(
        'fileName is required when using fileContent'
      );
    });
  });

  describe('with filePath', () => {
    const testDir = join(tmpdir(), 'backlog-mcp-test');
    const testFilePath = join(testDir, 'test-image.png');
    const testContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes

    beforeEach(() => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(testFilePath, testContent);
    });

    afterAll(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('reads file from disk and uploads', async () => {
      await tool.handler({ filePath: testFilePath });

      expect(mockPostSpaceAttachment).toHaveBeenCalledTimes(1);
      const form = mockPostSpaceAttachment.mock.calls[0][0] as FormData;
      const file = form.get('file') as File;
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('test-image.png');
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      expect(Array.from(bytes)).toEqual([0x89, 0x50, 0x4e, 0x47]);
    });

    it('uses custom fileName over basename when provided', async () => {
      await tool.handler({
        filePath: testFilePath,
        fileName: 'custom-name.png',
      });

      const form = mockPostSpaceAttachment.mock.calls[0][0] as FormData;
      const file = form.get('file') as File;
      expect(file.name).toBe('custom-name.png');
    });

    it('throws if filePath does not exist', async () => {
      await expect(
        tool.handler({ filePath: '/nonexistent/path/file.png' })
      ).rejects.toThrow('File not found: /nonexistent/path/file.png');
    });
  });

  describe('validation', () => {
    it('throws if neither filePath nor fileContent is provided', async () => {
      await expect(tool.handler({})).rejects.toThrow(
        'Either filePath or fileContent must be provided'
      );
    });
  });
});
