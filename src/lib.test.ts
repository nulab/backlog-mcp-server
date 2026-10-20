import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lib from './lib';
import { describe, it, expect } from 'vite-plus/test';
import type { z } from 'zod';
import type {
  BacklogClient,
  BacklogClientOptions,
  BacklogOAuthConfig,
  BacklogTokenData,
  ComposeOptions,
  NativeContentToolDefinition,
  ErrorLike,
  SafeResult,
  ToolDefinition,
  Toolset,
  ToolsetGroup,
  DescriptionHelper,
} from './lib';

// This module is the package's public API (`exports`): changing its surface must be deliberate.
describe('library entry point', () => {
  it('exports exactly the documented runtime surface', () => {
    expect(Object.keys(lib).sort()).toEqual([
      'BacklogTokenError',
      'allTools',
      'backlogErrorHandler',
      'buildBacklogAuthorizationUrl',
      'buildToolSchema',
      'composeNativeContentToolHandler',
      'composeToolHandler',
      'createBacklogClient',
      'createDescriptionHelper',
      'exchangeBacklogCode',
      'isErrorLike',
      'isGrantGone',
      'isTokenRejected',
      'refreshBacklogToken',
      'runWithAccessToken',
      'verifyBacklogToken',
    ]);
  });

  it('exports every runtime symbol as a function', () => {
    for (const [name, value] of Object.entries(lib)) {
      expect(typeof value, name).toBe('function');
    }
  });

  // Types vanish at runtime, so this is checked by `typecheck:all` instead.
  it('exports the documented types', () => {
    const types: [
      BacklogClient?,
      BacklogClientOptions?,
      BacklogOAuthConfig?,
      BacklogTokenData?,
      ComposeOptions?,
      NativeContentToolDefinition<z.ZodRawShape>?,
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
    expect(lib).not.toHaveProperty('loadDescriptionOverrides');
  });

  // ESM evaluates static imports whether or not they are used, so one Node-only
  // specifier anywhere in the graph breaks non-Node consumers.
  it('reaches no unportable Node built-in through a static import', () => {
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const seen = new Set<string>();
    const offenders: string[] = [];

    const walk = (file: string, trail: string[]): void => {
      if (seen.has(file)) return;
      seen.add(file);

      const source = stripComments(readFileSync(file, 'utf8'));
      for (const specifier of staticImportsOf(source)) {
        if (specifier.startsWith('node:')) {
          if (PORTABLE_BUILTINS.has(specifier)) continue;
          offenders.push(
            `${[...trail, relative(file)].join(' -> ')}: ${specifier}`
          );
          continue;
        }
        // Bare specifiers stop the walk: `exports` may resolve differently per runtime.
        if (!specifier.startsWith('.')) continue;
        walk(resolveTs(file, specifier), [...trail, relative(file)]);
      }
    };

    const relative = (file: string) => file.slice(srcDir.length + 1);
    walk(resolve(srcDir, 'lib.ts'), []);

    expect(offenders).toEqual([]);
    // A resolution failure would empty the graph and pass silently.
    expect(seen.size).toBeGreaterThan(50);
  });
});

// Built-ins every supported runtime has (`async_hooks`: Workers `nodejs_compat`, Deno, Bun).
// Adding to this set narrows which runtimes the package supports.
const PORTABLE_BUILTINS = new Set(['node:async_hooks']);

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[\t ]*\/\/.*$/gm, '');
}

// `import type` is erased by TypeScript; dynamic `import()` runs only when called.
function staticImportsOf(source: string): string[] {
  const pattern =
    /(?:^|\n)\s*(?:import|export)(?!\s+type\b)(?:[\s\S]*?from)?\s*['"]([^'"]+)['"]/g;
  return [...source.matchAll(pattern)].map(([, specifier]) => specifier);
}

function resolveTs(from: string, specifier: string): string {
  return resolve(dirname(from), specifier.replace(/\.js$/, '.ts'));
}
