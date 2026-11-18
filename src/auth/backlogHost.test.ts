import { describe, expect, it } from 'vite-plus/test';
import { resolveBacklogHost } from './backlogHost.js';

describe('resolveBacklogHost', () => {
  it.each(['acme.backlog.com', 'acme.backlog.jp', 'acme.backlogtool.com'])(
    'accepts the space host %s',
    (host) => {
      expect(resolveBacklogHost(host)).toBe(host);
    }
  );

  it('normalises case and surrounding whitespace', () => {
    expect(resolveBacklogHost('  ACME.Backlog.com ')).toBe('acme.backlog.com');
  });

  it.each([
    'evil.example.com',
    'backlog.com',
    'a.b.backlog.com',
    'acme.backlog.com.evil.com',
    'acme.backlog.com:8080',
    '-acme.backlog.com',
    'acme.backlog.com/path',
  ])('rejects %s', (host) => {
    expect(resolveBacklogHost(host)).toBeNull();
  });

  it('falls back to the default host when the header is absent', () => {
    expect(resolveBacklogHost(undefined, 'acme.backlog.com')).toBe(
      'acme.backlog.com'
    );
    expect(resolveBacklogHost('  ', 'acme.backlog.com')).toBe(
      'acme.backlog.com'
    );
  });

  it('accepts the configured default host even outside the Backlog domains', () => {
    expect(
      resolveBacklogHost('backlog.internal.example', 'backlog.internal.example')
    ).toBe('backlog.internal.example');
  });

  it('returns null with neither a header nor a default', () => {
    expect(resolveBacklogHost(undefined)).toBeNull();
  });
});
