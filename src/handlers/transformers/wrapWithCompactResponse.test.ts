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

const project = {
  id: 3,
  projectKey: 'PROJ',
  name: 'Project',
  chartEnabled: true,
  useWiki: true,
  useGit: false,
  textFormattingRule: 'markdown',
  archived: false,
  displayOrder: 2,
};

const status = {
  id: 1,
  projectId: 3,
  name: 'Open',
  color: '#ed8077',
  displayOrder: 1000,
};

const milestone = {
  id: 8,
  projectId: 3,
  name: 'v1',
  description: 'First release',
  archived: false,
  displayOrder: 0,
};

const issue = {
  id: 10,
  projectId: 3,
  issueKey: 'PROJ-1',
  keyId: 1,
  issueType: { id: 5, projectId: 3, name: 'Bug', color: '#990000' },
  summary: 'Fix it',
  description: 'Steps to reproduce',
  status,
  assignee: user,
  milestone: [milestone],
  dueDate: '2026-02-01',
};

// What a whole issue keeps: its own fields, with what is nested in it compacted.
const compactIssue = {
  id: 10,
  projectId: 3,
  issueKey: 'PROJ-1',
  keyId: 1,
  issueType: { id: 5, projectId: 3, name: 'Bug' },
  summary: 'Fix it',
  description: 'Steps to reproduce',
  status: { id: 1, projectId: 3, name: 'Open' },
  assignee: compactUser,
  milestone: [{ id: 8, projectId: 3, name: 'v1', archived: false }],
  dueDate: '2026-02-01',
};

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

  it('does not take an entity that merely has an id and a name for a user', () => {
    const priority = { id: 1, name: 'High' };

    expect(compactResponse({ priority })).toEqual({ priority });
  });

  it('cuts a nested project down to which one it is', () => {
    expect(compactResponse({ id: 1, project })).toEqual({
      id: 1,
      project: { id: 3, projectKey: 'PROJ', name: 'Project' },
    });
  });

  it('leaves a top-level project whole', () => {
    expect(compactResponse(project)).toEqual(project);
    expect(compactResponse([project])).toEqual([project]);
  });

  it('cuts a nested issue down to which one it is and its status', () => {
    const pullRequest = { id: 1, number: 2, issue };

    expect(compactResponse(pullRequest)).toEqual({
      id: 1,
      number: 2,
      issue: {
        id: 10,
        issueKey: 'PROJ-1',
        summary: 'Fix it',
        status: { id: 1, projectId: 3, name: 'Open' },
      },
    });
  });

  it('leaves a top-level issue whole apart from what is nested in it', () => {
    expect(compactResponse(issue)).toEqual(compactIssue);
  });

  it('leaves the issue of a watching list item as whole as a top-level one', () => {
    const item = {
      id: 1,
      resourceAlreadyRead: false,
      type: 'issue',
      issue,
      lastContentUpdated: '2026-01-01T00:00:00Z',
    };

    expect(compactResponse([item])).toEqual([{ ...item, issue: compactIssue }]);
  });

  it('drops color and displayOrder from nested entities only', () => {
    const issueType = {
      id: 5,
      projectId: 3,
      name: 'Bug',
      color: '#990000',
      displayOrder: 0,
    };

    expect(compactResponse({ id: 1, issueType })).toEqual({
      id: 1,
      issueType: { id: 5, projectId: 3, name: 'Bug' },
    });
    expect(compactResponse([issueType])).toEqual([issueType]);
  });

  it('drops the description of a nested milestone only', () => {
    expect(compactResponse({ id: 1, milestone: [milestone] })).toEqual({
      id: 1,
      milestone: [{ id: 8, projectId: 3, name: 'v1', archived: false }],
    });
    expect(compactResponse([milestone])).toEqual([milestone]);
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
