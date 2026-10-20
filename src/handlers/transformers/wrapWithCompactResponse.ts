import { isErrorLike, SafeResult } from '../../types/result.js';

// Cuts nested entities down to what identifies them and drops empty fields to save tokens.
// The top-level result, and a watching list item's issue, are what was asked for and stay whole.
export function wrapWithCompactResponse<I, O>(
  fn: (input: I) => Promise<SafeResult<O>>
): (input: I) => Promise<SafeResult<O>> {
  return async (input: I) => {
    const result = await fn(input);

    if (isErrorLike(result)) {
      return result;
    }

    return { kind: 'ok', data: compactResponse(result.data) as O };
  };
}

const USER_FIELDS = ['id', 'userId', 'name'] as const;
const PROJECT_FIELDS = ['id', 'projectKey', 'name'] as const;
const ISSUE_FIELDS = ['id', 'issueKey', 'summary', 'status'] as const;
const DISPLAY_FIELDS = new Set(['color', 'displayOrder']);

export function compactResponse(value: unknown): unknown {
  // The items of a top-level list are as much the subject as a single record.
  if (Array.isArray(value)) {
    return value.map((item) => compact(item, true));
  }
  return compact(value, true);
}

function compact(value: unknown, isSubject: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => compact(item, false));
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const source = value as Record<string, unknown>;

  if (!isSubject) {
    if (isUser(source)) return pick(source, USER_FIELDS);
    if (isProject(source)) return pick(source, PROJECT_FIELDS);
    if (isIssue(source)) return pick(source, ISSUE_FIELDS);
  }

  const watching = isWatchingListItem(source);
  const version = isVersion(source);
  const compacted: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(source)) {
    if (isEmpty(field)) continue;
    if (!isSubject && DISPLAY_FIELDS.has(key)) continue;
    if (!isSubject && version && key === 'description') continue;
    compacted[key] = compact(field, watching && key === 'issue');
  }
  return compacted;
}

function pick(
  source: Record<string, unknown>,
  fields: readonly string[]
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in source && !isEmpty(source[field])) {
      picked[field] = compact(source[field], false);
    }
  }
  return picked;
}

// Each check names fields that only that entity has among backlog-js's types.
// `roleType` is what tells a user apart: other entities carry an `id` and a
// `name`, and a Nulab account has neither `userId` nor `roleType`.
function isUser(value: Record<string, unknown>): boolean {
  return 'userId' in value && 'roleType' in value;
}

// An issue carries `projectId`, not `projectKey`.
function isProject(value: Record<string, unknown>): boolean {
  return 'projectKey' in value && 'textFormattingRule' in value;
}

function isIssue(value: Record<string, unknown>): boolean {
  return 'issueKey' in value && 'issueType' in value;
}

// A project is archived too, but has no `projectId`.
function isVersion(value: Record<string, unknown>): boolean {
  return 'projectId' in value && 'archived' in value && !('issueKey' in value);
}

function isWatchingListItem(value: Record<string, unknown>): boolean {
  return 'resourceAlreadyRead' in value && 'lastContentUpdated' in value;
}

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}
