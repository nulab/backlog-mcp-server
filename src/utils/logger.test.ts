// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from './logger.js';

describe('createLogger', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Arrange: force the verbose level so every record is emitted, then
    // capture stderr output written via console.error.
    process.env.LOG_LEVEL = 'debug';
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    delete process.env.LOG_LEVEL;
  });

  const lastRecord = (): Record<string, unknown> =>
    JSON.parse(errorSpy.mock.calls.at(-1)![0] as string);

  it('文字列のみのメッセージを msg として出力する', () => {
    const logger = createLogger();

    logger.info('hello world');

    const record = lastRecord();
    expect(record.level).toBe('info');
    expect(record.msg).toBe('hello world');
    expect(typeof record.time).toBe('string');
  });

  it('マージオブジェクトとメッセージの両方を含めて出力する', () => {
    const logger = createLogger();

    logger.warn({ clientId: 'c1' }, 'registered');

    const record = lastRecord();
    expect(record.level).toBe('warn');
    expect(record.msg).toBe('registered');
    expect(record.clientId).toBe('c1');
  });

  it('Error を直列化可能な形に展開する', () => {
    const logger = createLogger();

    logger.error({ err: new Error('boom') }, 'failed');

    const record = lastRecord();
    const err = record.err as Record<string, unknown>;
    expect(err.type).toBe('Error');
    expect(err.message).toBe('boom');
    expect(typeof err.stack).toBe('string');
  });

  it('最小レベル未満のレコードは出力しない', () => {
    process.env.LOG_LEVEL = 'error';
    const logger = createLogger();

    logger.info('should be filtered');

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
