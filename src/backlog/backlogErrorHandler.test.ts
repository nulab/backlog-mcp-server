// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi } from 'vitest';
import { runWithAccessToken } from '../auth/backlogAuthContext.js';
import { backlogErrorHandler } from './backlogErrorHandler.js';

const authError = {
  _name: 'BacklogAuthError',
  _status: 401,
  _url: 'https://example.backlog.com/api/v2/users/myself',
};

const apiError = {
  _name: 'BacklogApiError',
  _status: 404,
  _url: 'https://example.backlog.com/api/v2/issues/1',
  _body: { errors: [{ message: 'No issue.', code: 5 }] },
};

describe('backlogErrorHandler', () => {
  // API-key mode: no request context, so a 401 stays an ordinary tool error.
  it('reports nothing outside an OAuth request context', () => {
    const result = backlogErrorHandler(authError);

    expect(result.kind).toBe('error');
    expect(result.message).toContain('API key');
  });

  it('reports the failure inside an OAuth request context', async () => {
    const onAuthError = vi.fn();

    const result = await runWithAccessToken(
      'bl-token',
      async () => backlogErrorHandler(authError),
      onAuthError
    );

    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(result.message).toContain('Re-authenticate');
  });

  it('leaves a non-authentication failure alone', async () => {
    const onAuthError = vi.fn();

    const result = await runWithAccessToken(
      'bl-token',
      async () => backlogErrorHandler(apiError),
      onAuthError
    );

    expect(onAuthError).not.toHaveBeenCalled();
    expect(result.message).toContain('No issue.');
  });
});
