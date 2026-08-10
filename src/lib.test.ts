import * as lib from './lib';
import { describe, it, expect } from 'vitest';
import type { z } from 'zod';
import type {
  ComposeOptions,
  DynamicToolDefinition,
  DynamicToolset,
  DynamicToolsetGroup,
  ErrorLike,
  SafeResult,
  ToolDefinition,
  Toolset,
  ToolsetGroup,
  DescriptionHelper,
} from './lib';

/**
 * `package.json`'s `exports` field makes this module the package's public API, so
 * anything here is a compatibility promise. These tests exist to make a change to
 * that surface deliberate: adding an export means updating the list below, and
 * dropping one fails here instead of in a consumer's build.
 */
describe('library entry point', () => {
  it('exports exactly the documented runtime surface', () => {
    expect(Object.keys(lib).sort()).toEqual([
      'allTools',
      'backlogErrorHandler',
      'buildToolSchema',
      'composeToolHandler',
      'createDescriptionHelper',
      'isErrorLike',
    ]);
  });

  it('exports every runtime symbol as a function', () => {
    for (const [name, value] of Object.entries(lib)) {
      expect(typeof value, name).toBe('function');
    }
  });

  // Types vanish at runtime, so the check has to happen at compile time: this fails
  // `typecheck:all` if any of them stops being exported.
  it('exports the documented types', () => {
    const types: [
      ComposeOptions?,
      DynamicToolDefinition<z.ZodRawShape>?,
      DynamicToolset?,
      DynamicToolsetGroup?,
      ErrorLike?,
      SafeResult<unknown>?,
      ToolDefinition<z.ZodRawShape, z.ZodRawShape>?,
      Toolset?,
      ToolsetGroup?,
      DescriptionHelper?,
    ] = [];

    expect(types).toEqual([]);
  });

  it('does not leak the Node-only override loader', () => {
    // It reads from disk, which would defeat the point of this entry point.
    expect(lib).not.toHaveProperty('loadDescriptionOverrides');
  });
});
