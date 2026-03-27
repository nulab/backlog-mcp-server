import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { wrapServerWithToolRegistry } from './wrapServerWithToolRegistry';

describe('wrapServerWithToolRegistry', () => {
  let mockServer: any;
  let toolCalls: Array<{ name: string; description: string }> = [];

  beforeEach(() => {
    toolCalls = [];

    mockServer = {
      tool: vi.fn((name: string, description: string) => {
        toolCalls.push({ name, description });
      }),
    };
  });

  it('registers a tool when not already registered', () => {
    const server = wrapServerWithToolRegistry(mockServer);
    const schema = z.object({}).shape;

    server.registerOnce('hello', 'test tool', schema, () => ({
      content: [{ type: 'text', text: 'ok' }],
    }));

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe('hello');
  });

  it('skips duplicate registration', () => {
    const server = wrapServerWithToolRegistry(mockServer);
    const schema = z.object({}).shape;

    server.registerOnce('dup', 'first', schema, () => ({
      content: [{ type: 'text', text: 'ok' }],
    }));
    server.registerOnce('dup', 'second', schema, () => ({
      content: [{ type: 'text', text: 'ok' }],
    }));

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe('dup');
    expect(toolCalls[0].description).toBe('first');
  });

  it('does not throw if registerOnce is called twice with same name', () => {
    const server = wrapServerWithToolRegistry(mockServer);
    const schema = z.object({}).shape;

    expect(() => {
      server.registerOnce('toolX', 'desc1', schema, () => ({
        content: [{ type: 'text', text: 'ok' }],
      }));
      server.registerOnce('toolX', 'desc2', schema, () => ({
        content: [{ type: 'text', text: 'ok' }],
      }));
    }).not.toThrow();

    expect(toolCalls).toHaveLength(1);
  });

  it('adds __registeredToolNames to server', () => {
    const server = wrapServerWithToolRegistry(mockServer);
    expect(server.__registeredToolNames).toBeInstanceOf(Set);
  });

  it('registers multiple distinct tools', () => {
    const server = wrapServerWithToolRegistry(mockServer);
    const schema = z.object({}).shape;

    server.registerOnce('tool1', 'desc1', schema, () => ({
      content: [{ type: 'text', text: 'ok' }],
    }));
    server.registerOnce('tool2', 'desc2', schema, () => ({
      content: [{ type: 'text', text: 'ok' }],
    }));

    expect(toolCalls).toHaveLength(2);
    expect(toolCalls[0].name).toBe('tool1');
    expect(toolCalls[1].name).toBe('tool2');
  });
});
