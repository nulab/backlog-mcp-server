import { wrapWithTokenLimit } from './wrapWithTokenLimit.js';
import { describe, it, expect } from '@jest/globals';
import { SafeResult } from '../../types/result.js';

describe('wrapWithTokenLimit', () => {
  it('returns full JSON string if under maxTokens', async () => {
    const obj = { id: 1, name: 'Short' };

    const handler = async () =>
      ({ kind: 'ok', data: obj }) satisfies SafeResult<typeof obj>;

    const wrapped = wrapWithTokenLimit(handler, 1000); // 十分余裕あり

    const result = await wrapped({});

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.data).toBe(JSON.stringify(obj, null, 2));
    }
  });

  it('streams and truncates if over maxTokens', async () => {
    const obj = {
      description: 'A '.repeat(5000), // 長文でトークン制限に引っかかる
    };

    const handler = async () =>
      ({ kind: 'ok', data: obj }) satisfies SafeResult<typeof obj>;

    const wrapped = wrapWithTokenLimit(handler, 100); // 小さな上限

    const result = await wrapped({});

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.data.length).toBeLessThanOrEqual(500); // 字数でざっくり
      expect(result.data).toMatch(/truncated/i); // デフォルトの切り詰めメッセージが含まれるはず
    }
  });

  it('passes through error result unchanged', async () => {
    const handler = async () =>
      ({ kind: 'error', message: 'Boom' }) satisfies SafeResult<unknown>;

    const wrapped = wrapWithTokenLimit(handler, 1000);

    const result = await wrapped({});

    expect(result).toEqual({ kind: 'error', message: 'Boom' });
  });
});
