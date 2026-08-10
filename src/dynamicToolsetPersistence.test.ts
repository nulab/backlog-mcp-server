// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { McpServer } from '@modelcontextprotocol/server';
import { createDescriptionHelper } from './createDescriptionHelper.js';
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
  const mcpOption = {
    useFields: false,
    maxTokens: 50000,
    prefix: '',
    useOrganization: true,
  };

  const buildFactory = () => {
    const descriptionHelper = createDescriptionHelper();
    // One group, shared by every server the factory produces — the wiring
    // `src/index.ts` uses.
    const sharedToolsetGroup = buildToolsetGroup(
      backlog,
      descriptionHelper,
      []
    );

    const createServer = () =>
      createBacklogMcpServer({
        version: '1.0.0',
        useFields: false,
        backlog,
        clientRegistry,
        descriptionHelper,
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

  // Registration composes `organization` (and `fields`) onto a copy of the
  // tool's schema. The shared group is read by every per-request server, so
  // registration must leave the definitions exactly as `buildToolsetGroup` left
  // them — a definition that grew keys per request would corrupt the schema
  // every client sees after the first one.
  it('does not mutate shared tool definitions when registering', () => {
    const descriptionHelper = createDescriptionHelper();
    const sharedToolsetGroup = buildToolsetGroup(backlog, descriptionHelper, [
      'all',
    ]);

    const firstTool = () => sharedToolsetGroup.toolsets[0].tools[0];
    const shapeOfFirstTool = () =>
      Object.keys((firstTool().schema as { shape: object }).shape).sort();

    const pristineSchema = firstTool().schema;
    const pristineShape = shapeOfFirstTool();
    expect(pristineShape).not.toContain('organization');

    const register = () =>
      createBacklogMcpServer({
        version: '1.0.0',
        useFields: true, // would add `fields` on top of `organization`
        backlog,
        clientRegistry,
        descriptionHelper,
        enabledToolsets: ['all'],
        mcpOption: { ...mcpOption, useFields: true },
        dynamicToolsets: false,
        toolsetGroup: sharedToolsetGroup,
      });

    register();
    register();
    register();

    expect(firstTool().schema).toBe(pristineSchema);
    expect(shapeOfFirstTool()).toEqual(pristineShape);
  });
});
