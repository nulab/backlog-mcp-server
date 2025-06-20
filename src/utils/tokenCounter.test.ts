import { countTokens } from './tokenCounter.js';
import { describe, it, expect } from '@jest/globals';

describe('countTokens', () => {
  it('returns 0 for empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('counts simple words', () => {
    expect(countTokens('hello world')).toBe(2);
    expect(countTokens('one two three')).toBe(3);
  });

  it('ignores multiple spaces/tabs/newlines', () => {
    expect(countTokens('hello     world')).toBe(2);
    expect(countTokens('hello\tworld')).toBe(2);
    expect(countTokens('hello\nworld')).toBe(2);
    expect(countTokens('hello \n\t world')).toBe(2);
  });

  it('counts punctuation as separate tokens', () => {
    expect(countTokens('hello, world!')).toBe(4);
    expect(countTokens('foo(bar)')).toBe(4);
  });

  it('handles mixed text', () => {
    const input = "This is great, isn't it?";
    // Tokens: ['This', 'is', 'great', ',', 'isn', "'", 't', 'it', '?']
    expect(countTokens(input)).toBe(9);
  });

  it('trims leading/trailing whitespace', () => {
    expect(countTokens('   hello world   ')).toBe(2);
  });

  it('counts digits and symbols', () => {
    expect(countTokens('123 + 456 = 579')).toBe(5); // ['123', '+', '456', '=', '579']
  });

  it('counts Japanese', () => {
    expect(countTokens('こんにちは')).toBe(5);
  });
});
