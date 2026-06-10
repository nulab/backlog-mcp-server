// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import {
  runWithAccessToken,
  runWithOAuthContext,
  getCurrentAccessToken,
  getCurrentBacklogDomain,
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

  describe('runWithOAuthContext', () => {
    it('provides both access token and backlog domain', async () => {
      let token: string | undefined;
      let domain: string | undefined;
      await runWithOAuthContext('my-token', 'example.backlog.com', async () => {
        token = getCurrentAccessToken();
        domain = getCurrentBacklogDomain();
      });
      expect(token).toBe('my-token');
      expect(domain).toBe('example.backlog.com');
    });

    it('returns undefined for domain outside context', () => {
      expect(getCurrentBacklogDomain()).toBeUndefined();
    });

    it('isolates contexts between nested calls', async () => {
      let outerDomain: string | undefined;
      let innerDomain: string | undefined;
      await runWithOAuthContext('t1', 'outer.backlog.com', async () => {
        await runWithOAuthContext('t2', 'inner.backlog.com', async () => {
          innerDomain = getCurrentBacklogDomain();
        });
        outerDomain = getCurrentBacklogDomain();
      });
      expect(innerDomain).toBe('inner.backlog.com');
      expect(outerDomain).toBe('outer.backlog.com');
    });
  });
});
