import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lib from './lib';
import { describe, it, expect } from 'vitest';
import type { z } from 'zod';
import type {
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

/**
 * `package.json`'s `exports` field makes this module the package's public API, so
 * anything here is a compatibility promise. These tests exist to make a change to
 * that surface deliberate: adding an export means updating the list below, and
 * dropping one fails here instead of in a consumer's build.
 */
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
      'createDescriptionHelper',
      'exchangeBacklogCode',
      'isErrorLike',
      'isGrantGone',
      'isTokenRejected',
      'refreshBacklogToken',
      'verifyBacklogToken',
    ]);
  });

  // A class is a function too, so `BacklogTokenError` belongs in this check.
  it('exports every runtime symbol as a function', () => {
    for (const [name, value] of Object.entries(lib)) {
      expect(typeof value, name).toBe('function');
    }
  });

  // Types vanish at runtime, so the check has to happen at compile time: this fails
  // `typecheck:all` if any of them stops being exported.
  it('exports the documented types', () => {
    const types: [
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
    // It reads from disk, which would defeat the point of this entry point.
    expect(lib).not.toHaveProperty('loadDescriptionOverrides');
  });

  // The header of `src/lib.ts` reads as a guarantee and gets used as one — #180
  // put `createTranslationHelper` on a subpath to keep `cosmiconfig` and
  // `node:os` out of this graph — so it is checked rather than trusted. ESM
  // evaluates static imports whether or not the symbol is used, so one
  // specifier anywhere in the graph breaks it for every consumer.
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
        // Bare specifiers stop the walk: `exports` may hand a different file
        // to each runtime, so a source-level walk cannot answer for a package.
        // `cosmiconfig` is therefore not covered here.
        if (!specifier.startsWith('.')) continue;
        walk(resolveTs(file, specifier), [...trail, relative(file)]);
      }
    };

    const relative = (file: string) => file.slice(srcDir.length + 1);
    walk(resolve(srcDir, 'lib.ts'), []);

    expect(offenders).toEqual([]);
    // A resolution failure would empty the graph and pass silently, so pin that
    // the walk actually reached the tool layer.
    expect(seen.size).toBeGreaterThan(50);
  });
});

/**
 * Not "harmless built-ins" but "built-ins every runtime a consumer is on has".
 * `async_hooks` is on Workers (`nodejs_compat`), Deno and Bun, and the two
 * `AsyncLocalStorage` request contexts need it on import. Adding to this set
 * narrows which runtimes the package supports — argue for it in the commit.
 */
const PORTABLE_BUILTINS = new Set(['node:async_hooks']);

/** Blanks out comments so a specifier mentioned in prose is not read as code. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[\t ]*\/\/.*$/gm, '');
}

/**
 * Value-level static imports and re-exports. `import type` is dropped because
 * TypeScript erases it; dynamic `import()` is not matched, since it runs only
 * when called.
 */
function staticImportsOf(source: string): string[] {
  const pattern =
    /(?:^|\n)\s*(?:import|export)(?!\s+type\b)(?:[\s\S]*?from)?\s*['"]([^'"]+)['"]/g;
  return [...source.matchAll(pattern)].map(([, specifier]) => specifier);
}

/** Maps the `.js` specifier the emitted ESM needs back to its `.ts` source. */
function resolveTs(from: string, specifier: string): string {
  return resolve(dirname(from), specifier.replace(/\.js$/, '.ts'));
}
