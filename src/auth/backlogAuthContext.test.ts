// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi } from 'vitest';
import {
  runWithAccessToken,
  getCurrentAccessToken,
  reportBacklogAuthError,
  hasBacklogAuthErrorBeenReported,
} from './backlogAuthContext.js';

describe('backlogAuthContext', () => {
  it('provides the access token within the callback', async () => {
    let captured: string | undefined;
    await runWithAccessToken('test-token', async () => {
      captured = getCurrentAccessToken();
    });
    expect(captured).toBe('test-token');
  });

  it('returns undefined outside of runWithAccessToken', () => {
    expect(getCurrentAccessToken()).toBeUndefined();
  });

  it('isolates tokens between nested calls', async () => {
    let outerToken: string | undefined;
    let innerToken: string | undefined;
    await runWithAccessToken('outer', async () => {
      await runWithAccessToken('inner', async () => {
        innerToken = getCurrentAccessToken();
      });
      outerToken = getCurrentAccessToken();
    });
    expect(innerToken).toBe('inner');
    expect(outerToken).toBe('outer');
  });

  describe('reportBacklogAuthError', () => {
    it('invokes the callback and records the report', async () => {
      const onAuthError = vi.fn();
      let reported = false;

      await runWithAccessToken(
        'test-token',
        async () => {
          reportBacklogAuthError();
          reported = hasBacklogAuthErrorBeenReported();
        },
        onAuthError
      );

      expect(onAuthError).toHaveBeenCalledTimes(1);
      expect(reported).toBe(true);
    });

    // A single tool call can fan out into several Backlog requests; the token
    // only needs revoking once.
    it('invokes the callback once however often it is reported', async () => {
      const onAuthError = vi.fn();

      await runWithAccessToken(
        'test-token',
        async () => {
          reportBacklogAuthError();
          reportBacklogAuthError();
          reportBacklogAuthError();
        },
        onAuthError
      );

      expect(onAuthError).toHaveBeenCalledTimes(1);
    });

    // API-key mode never establishes the context, which is what keeps a 401 on
    // the stdio transport an ordinary tool error.
    it('is a no-op outside of runWithAccessToken', () => {
      expect(() => reportBacklogAuthError()).not.toThrow();
      expect(hasBacklogAuthErrorBeenReported()).toBe(false);
    });

    it('reports nothing when no failure occurred', async () => {
      const onAuthError = vi.fn();
      let reported = true;

      await runWithAccessToken(
        'test-token',
        async () => {
          reported = hasBacklogAuthErrorBeenReported();
        },
        onAuthError
      );

      expect(onAuthError).not.toHaveBeenCalled();
      expect(reported).toBe(false);
    });

    it('does not leak a report to an enclosing context', async () => {
      const outer = vi.fn();
      const inner = vi.fn();
      let outerReported = true;

      await runWithAccessToken(
        'outer',
        async () => {
          await runWithAccessToken(
            'inner',
            async () => reportBacklogAuthError(),
            inner
          );
          outerReported = hasBacklogAuthErrorBeenReported();
        },
        outer
      );

      expect(inner).toHaveBeenCalledTimes(1);
      expect(outer).not.toHaveBeenCalled();
      expect(outerReported).toBe(false);
    });
  });
});
