// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { McpServer } from '@modelcontextprotocol/server';
import { createTranslationHelper } from './createTranslationHelper.js';
import { createBacklogMcpServer } from './createBacklogMcpServer.js';
import type { BacklogClientRegistry } from './utils/backlogClientRegistry.js';
import { buildToolsetGroup, getToolset } from './utils/toolsetUtils.js';

/**
 * `enable_toolset` mutates the toolset group it was handed. The stateless HTTP
 * model builds one server per request and throws it away, so the group has to
 * outlive the server for the feature to mean anything — these tests pin that.
 */
describe('dynamic toolset enablement across servers from one factory', () => {
  const backlog = {} as Backlog;
  const clientRegistry = {
    createScopedClient: () => backlog,
  } as unknown as BacklogClientRegistry;
  const mcpOption = { useFields: false, maxTokens: 50000, prefix: '' };

  const buildFactory = () => {
    const transHelper = createTranslationHelper();
    // One group, shared by every server the factory produces — the wiring
    // `src/index.ts` uses.
    const sharedToolsetGroup = buildToolsetGroup(backlog, transHelper, []);

    const createServer = () =>
      createBacklogMcpServer({
        version: '1.0.0',
        useFields: false,
        backlog,
        clientRegistry,
        transHelper,
        enabledToolsets: [],
        mcpOption,
        dynamicToolsets: true,
        toolsetGroup: sharedToolsetGroup,
      });

    return { createServer, sharedToolsetGroup };
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a toolset enabled on one server is registered by the next server', async () => {
    const { createServer, sharedToolsetGroup } = buildFactory();

    // Registration happens inside the constructor path, so the spy has to be on
    // the prototype and in place before the first server is built.
    const registerTool = vi.spyOn(McpServer.prototype, 'registerTool');

    const first = createServer();
    // The refresh notifies over the connection; there is no transport here.
    vi.spyOn(
      Object.getPrototypeOf(first.server),
      'sendToolListChanged'
    ).mockResolvedValue(undefined);

    // Nothing is enabled to start with, so no `space` tool is registered.
    expect(getToolset(sharedToolsetGroup, 'space')?.enabled).toBe(false);

    const call = registerTool.mock.calls.find(
      ([name]) => name === 'enable_toolset'
    );
    if (!call) throw new Error('enable_toolset was not registered');
    const handler = call[2] as unknown as (args: {
      toolset: string;
    }) => Promise<unknown>;
    await handler({ toolset: 'space' });

    // The mutation landed on the shared group, not on the discarded server.
    expect(getToolset(sharedToolsetGroup, 'space')?.enabled).toBe(true);

    // A server built for a later request now registers the space tools.
    const second = createServer();
    expect([...second.__registeredToolNames!]).toContain('get_space');
  });

  it('leaves a fresh factory unaffected (state is per-factory, not global)', () => {
    const { createServer: createOther } = buildFactory();
    expect([...createOther().__registeredToolNames!]).not.toContain(
      'get_space'
    );
  });

  // `composeToolHandler` extends `tool.schema` in place. That mutation used to
  // land on throwaway per-server definitions; sharing the group makes it
  // cross-request, so its convergence is now load-bearing rather than
  // incidental — a re-extension that accumulated keys would corrupt the tool
  // schema every client sees after the first request.
  it('keeps tool input schemas stable across repeated registration', () => {
    const transHelper = createTranslationHelper();
    const sharedToolsetGroup = buildToolsetGroup(backlog, transHelper, ['all']);

    const shapeOfFirstTool = () => {
      const tool = sharedToolsetGroup.toolsets[0].tools[0];
      return Object.keys((tool.schema as { shape: object }).shape).sort();
    };

    const register = () =>
      createBacklogMcpServer({
        version: '1.0.0',
        useFields: true, // adds `fields` on top of `organization`
        backlog,
        clientRegistry,
        transHelper,
        enabledToolsets: ['all'],
        mcpOption: { ...mcpOption, useFields: true },
        dynamicToolsets: false,
        toolsetGroup: sharedToolsetGroup,
      });

    register();
    const afterFirst = shapeOfFirstTool();
    expect(afterFirst).toEqual(
      expect.arrayContaining(['organization', 'fields'])
    );

    register();
    register();
    expect(shapeOfFirstTool()).toEqual(afterFirst);
  });
});
