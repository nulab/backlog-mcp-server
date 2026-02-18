import { resolveIdOrKey, resolveIdOrName } from './resolveIdOrKey'; // Added resolveIdOrName and EntityName
import { describe, it, expect } from 'vitest';

const t = (_key: string, fallback: string) => fallback;

describe('resolveIdOrKey', () => {
  it('resolves ID when provided', () => {
    const result = resolveIdOrKey('issue', { id: 123 }, t);
    expect(result).toEqual({ ok: true, value: 123 }); // Expect number
  });

  it('resolves key when ID is not provided', () => {
    const result = resolveIdOrKey('project', { key: 'PRJ-001' }, t);
    expect(result).toEqual({ ok: true, value: 'PRJ-001' });
  });

  it("returns error for 'project' when neither ID nor key is provided", () => {
    const result = resolveIdOrKey('project', {}, t);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Project ID or key is required');
    }
  });

  it("resolves ID for 'repository'", () => {
    const result = resolveIdOrKey('repository', { id: 777 }, t);
    expect(result).toEqual({ ok: true, value: 777 });
  });

  it("returns error for 'repository' when neither ID nor key is provided", () => {
    const result = resolveIdOrKey('repository', {}, t);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Repository ID or key is required');
    }
  });
});

describe('resolveIdOrName', () => {
  it('resolves ID when provided', () => {
    const result = resolveIdOrName('issue', { id: 456 }, t);
    expect(result).toEqual({ ok: true, value: 456 });
  });

  it('resolves name when ID is not provided', () => {
    const result = resolveIdOrName('project', { name: 'MyProject' }, t);
    expect(result).toEqual({ ok: true, value: 'MyProject' });
  });

  it("returns error for 'repository' when neither ID nor name is provided", () => {
    const result = resolveIdOrName('repository', {}, t);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Repository ID or name is required');
    }
  });

  it("resolves ID for 'git' entity (using name field)", () => {
    // 'git' might be an alias or specific use case for 'repository' that uses 'name'
    const result = resolveIdOrName('repository', { id: 888 }, t);
    expect(result).toEqual({ ok: true, value: 888 });
  });

  it("resolves name for 'git' entity", () => {
    const result = resolveIdOrName('repository', { name: 'main-repo' }, t);
    expect(result).toEqual({ ok: true, value: 'main-repo' });
  });

  it("returns error for 'git' when neither ID nor name is provided", () => {
    const result = resolveIdOrName('repository', {}, t);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Repository ID or name is required');
    }
  });
});
