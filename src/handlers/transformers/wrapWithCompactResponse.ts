import { isErrorLike, SafeResult } from '../../types/result.js';

/**
 * Shrinks a successful result before it is serialised for the client.
 *
 * Backlog embeds a whole entity wherever one is referenced. A model needs to
 * know which one, not every field of it, so a nested entity is cut down to
 * what identifies it:
 *
 * - a user (`createdUser`, `assignee`, `stars[].presenter`, a notification's
 *   `sender`) to `id`, `userId` and `name`, dropping its mail address,
 *   language, last login and Nulab account;
 * - a project (each activity's and notification's `project`) to `id`,
 *   `projectKey` and `name`, dropping its settings flags;
 * - an issue (a pull request's or notification's `issue`) to `id`,
 *   `issueKey`, `summary` and `status`.
 *
 * Every nested entity loses `color` and `displayOrder`, which only matter on
 * screen — statuses, issue types, categories, milestones, the items of a
 * custom field — and a nested milestone loses its `description`, which an
 * issue list would otherwise repeat per issue.
 *
 * What is at the top of the result (`get_myself`, `get_project`, an item of
 * `get_users` or `get_issue_types`) is what was asked for and is left whole.
 * So is the issue of a watching list item, which is what the list is about.
 *
 * Fields with nothing in them — `null`, `''`, `[]` — are dropped as well:
 * every issue carries `resolution: null`, `attachments: []`, `stars: []` and
 * the like, and their absence says the same thing in fewer tokens.
 */
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
