import {
  compactResponse,
  wrapWithCompactResponse,
} from './wrapWithCompactResponse';
import type { SafeResult } from '../../types/result';
import { vi, describe, it, expect } from 'vite-plus/test';

const user = {
  id: 7,
  userId: 'alice',
  name: 'Alice',
  roleType: 1,
  lang: 'ja',
  mailAddress: 'alice@example.com',
  nulabAccount: { nulabId: 'x', name: 'Alice', uniqueId: 'alice' },
  keyword: 'alice alice',
  lastLoginTime: '2026-01-01T00:00:00Z',
};

const compactUser = { id: 7, userId: 'alice', name: 'Alice' };

describe('compactResponse', () => {
  it('cuts a nested user down to who it is', () => {
    expect(compactResponse({ id: 1, createdUser: user })).toEqual({
      id: 1,
      createdUser: compactUser,
    });
  });

  it('cuts users nested in arrays and deeper objects', () => {
    const issue = {
      id: 1,
      stars: [{ id: 2, presenter: user }],
      content: { comment: { createdUser: user } },
    };

    expect(compactResponse(issue)).toEqual({
      id: 1,
      stars: [{ id: 2, presenter: compactUser }],
      content: { comment: { createdUser: compactUser } },
    });
  });

  it('leaves a top-level user whole', () => {
    expect(compactResponse(user)).toEqual(user);
  });

  it('leaves the users of a top-level list whole', () => {
    expect(compactResponse([user])).toEqual([user]);
  });

  it('leaves an entity that merely has an id and a name alone', () => {
    const status = { id: 1, projectId: 2, name: 'Open', color: '#fff' };

    expect(compactResponse({ status })).toEqual({ status });
  });

  it('drops null, empty strings and empty arrays', () => {
    expect(
      compactResponse({
        id: 1,
        resolution: null,
        description: '',
        attachments: [],
        dueDate: undefined,
      })
    ).toEqual({ id: 1 });
  });

  it('keeps falsy values that carry meaning', () => {
    const data = { count: 0, enabled: false, config: {} };

    expect(compactResponse(data)).toEqual(data);
  });

  it('applies to every item of a top-level list', () => {
    expect(
      compactResponse([
        { id: 1, assignee: user, category: [] },
        { id: 2, assignee: null },
      ])
    ).toEqual([{ id: 1, assignee: compactUser }, { id: 2 }]);
  });

  it('returns a scalar as is', () => {
    expect(compactResponse('text')).toBe('text');
    expect(compactResponse(3)).toBe(3);
  });
});

describe('wrapWithCompactResponse', () => {
  it('compacts a successful result', async () => {
    const wrapped = wrapWithCompactResponse(
      vi.fn(async () => ({ kind: 'ok', data: { a: null, b: 1 } }) as const)
    );

    expect(await wrapped({})).toEqual({ kind: 'ok', data: { b: 1 } });
  });

  it('passes an error through unchanged', async () => {
    const error: SafeResult<unknown> = { kind: 'error', message: 'Boom' };
    const wrapped = wrapWithCompactResponse(vi.fn(async () => error));

    expect(await wrapped({})).toBe(error);
  });
});
