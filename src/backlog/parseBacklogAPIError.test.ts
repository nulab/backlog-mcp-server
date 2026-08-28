// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { parseBacklogAPIError } from './parseBacklogAPIError.js';

const authError = {
  _name: 'BacklogAuthError',
  _status: 401,
  _url: 'https://example.backlog.com/api/v2/users/myself',
};

describe('parseBacklogAPIError', () => {
  describe('BacklogAuthError', () => {
    it('points an API-key deployment at its API key', () => {
      const parsed = parseBacklogAPIError(authError);

      expect(parsed.type).toBe('BacklogAuthError');
      expect(parsed.status).toBe(401);
      expect(parsed.message).toContain('API key');
    });

    it('defaults to the API-key wording, so stdio is unaffected', () => {
      expect(parseBacklogAPIError(authError, {}).message).toBe(
        parseBacklogAPIError(authError, { authMode: 'apiKey' }).message
      );
    });

    // There is no API key to check in OAuth mode, so the original wording sent
    // the user somewhere there was nothing to fix.
    it('tells an OAuth deployment to re-authenticate instead', () => {
      const parsed = parseBacklogAPIError(authError, { authMode: 'oauth' });

      expect(parsed.type).toBe('BacklogAuthError');
      expect(parsed.message).not.toContain('API key');
      expect(parsed.message).toContain('Re-authenticate');
    });
  });

  describe('other errors', () => {
    it('reports a Backlog API error with its code', () => {
      const parsed = parseBacklogAPIError(
        {
          _name: 'BacklogApiError',
          _status: 404,
          _url: 'https://example.backlog.com/api/v2/issues/1',
          _body: { errors: [{ message: 'No issue.', code: 5 }] },
        },
        { authMode: 'oauth' }
      );

      expect(parsed.type).toBe('BacklogApiError');
      expect(parsed.code).toBe(5);
      expect(parsed.message).toContain('No issue.');
    });

    it('falls back to the message of a plain error', () => {
      const parsed = parseBacklogAPIError(new Error('socket hang up'));

      expect(parsed.type).toBe('UnknownError');
      expect(parsed.message).toBe('socket hang up');
    });
  });
});
