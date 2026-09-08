import { describe, it, expect } from 'vitest';
import { isInsideRoot, parseAttachmentRoots } from './attachmentRoots.js';

describe('parseAttachmentRoots', () => {
  it('returns undefined when the variable is unset', () => {
    expect(parseAttachmentRoots(undefined, ':')).toBeUndefined();
  });

  it('returns undefined when the variable holds only separators and spaces', () => {
    expect(parseAttachmentRoots('  :  : ', ':')).toBeUndefined();
  });

  it('splits on the delimiter and trims each entry', () => {
    expect(parseAttachmentRoots('/srv/uploads: /tmp/in ', ':')).toEqual([
      '/srv/uploads',
      '/tmp/in',
    ]);
  });

  it('drops empty entries rather than treating them as a root', () => {
    expect(parseAttachmentRoots('/a::/b:', ':')).toEqual(['/a', '/b']);
  });

  it('uses the delimiter it is given, so Windows paths survive', () => {
    expect(parseAttachmentRoots('C:\\in;D:\\out', ';')).toEqual([
      'C:\\in',
      'D:\\out',
    ]);
  });
});

describe('isInsideRoot', () => {
  it('accepts the root itself', () => {
    expect(isInsideRoot('/srv/uploads', '/srv/uploads', '/')).toBe(true);
  });

  it('accepts a path beneath the root', () => {
    expect(isInsideRoot('/srv/uploads/a/b.png', '/srv/uploads', '/')).toBe(
      true
    );
  });

  it('rejects a sibling whose name merely starts with the root', () => {
    expect(isInsideRoot('/srv/uploads-secret/a.png', '/srv/uploads', '/')).toBe(
      false
    );
  });

  it('rejects a path outside the root', () => {
    expect(isInsideRoot('/etc/passwd', '/srv/uploads', '/')).toBe(false);
  });

  it('treats a root with a trailing separator the same as one without', () => {
    expect(isInsideRoot('/srv/uploads/a.png', '/srv/uploads/', '/')).toBe(true);
  });

  it('works with a Windows separator', () => {
    expect(isInsideRoot('C:\\in\\a.png', 'C:\\in', '\\')).toBe(true);
    expect(isInsideRoot('C:\\input\\a.png', 'C:\\in', '\\')).toBe(false);
  });
});
