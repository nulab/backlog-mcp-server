import { isErrorLike, SafeResult } from '../../types/result.js';

/**
 * Shrinks a successful result before it is serialised for the client.
 *
 * Backlog embeds a whole user wherever one is referenced — `createdUser`,
 * `assignee`, `stars[].presenter`, a notification's `sender` — each with its
 * mail address, language, last login and Nulab account. A model needs to know
 * who, not their profile, so a nested user is cut down to `id`, `userId` and
 * `name`. A user at the top of the result (`get_myself`, an item of
 * `get_users`) is what was asked for and is left whole.
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

  if (!isSubject && isUser(source)) {
    const user: Record<string, unknown> = {};
    for (const field of USER_FIELDS) {
      if (field in source) user[field] = source[field];
    }
    return user;
  }

  const compacted: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(source)) {
    if (isEmpty(field)) continue;
    compacted[key] = compact(field, false);
  }
  return compacted;
}

// `roleType` is what tells a user apart: other entities carry an `id` and a
// `name`, and a Nulab account has neither `userId` nor `roleType`.
function isUser(value: Record<string, unknown>): boolean {
  return 'userId' in value && 'roleType' in value;
}

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}
