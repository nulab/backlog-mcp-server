// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import {
  runWithAccessToken,
  getCurrentAccessToken,
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
});
