import { describe, it, expect } from 'vitest';
import { validateTransportOptions } from './validateTransportOptions';

describe('validateTransportOptions', () => {
  it('rejects dynamic toolsets on the http transport', () => {
    const problem = validateTransportOptions({
      transport: 'http',
      dynamicToolsets: true,
    });

    expect(problem).toContain('--dynamic-toolsets');
    expect(problem).toContain('--transport http');
  });

  it('allows dynamic toolsets on stdio, where there is one client per process', () => {
    expect(
      validateTransportOptions({ transport: 'stdio', dynamicToolsets: true })
    ).toBeUndefined();
  });

  it('allows the http transport without dynamic toolsets', () => {
    expect(
      validateTransportOptions({ transport: 'http', dynamicToolsets: false })
    ).toBeUndefined();
  });

  it('allows the default combination', () => {
    expect(
      validateTransportOptions({ transport: 'stdio', dynamicToolsets: false })
    ).toBeUndefined();
  });
});
