// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { resolveWorkerConfig, type WorkerVars } from './config.js';

/**
 * Builds the loose env view consumed by the config reader.
 */
function envWith(vars: Record<string, string>): WorkerVars {
  return { ...vars };
}

describe('resolveWorkerConfig', () => {
  it('未設定時はCLIと同じデフォルトを返す', () => {
    const config = resolveWorkerConfig(envWith({}));

    expect(config.mcpPath).toBe('/mcp');
    expect(config.useFields).toBe(false);
    expect(config.maxTokens).toBe(50000);
    expect(config.prefix).toBe('');
    expect(config.enabledToolsets).toEqual(['all']);
    expect(config.dynamicToolsets).toBe(false);
    expect(config.enableJsonResponse).toBe(false);
    expect(config.allowedHosts).toBeUndefined();
  });

  it('各varを解釈して上書きする', () => {
    const config = resolveWorkerConfig(
      envWith({
        MCP_HTTP_PATH: 'mcp-endpoint',
        OPTIMIZE_RESPONSE: 'true',
        MAX_TOKENS: '12000',
        PREFIX: 'demo_',
        ENABLE_TOOLSETS: 'issue, git ,wiki',
        MCP_HTTP_JSON_RESPONSE: 'true',
        MCP_HTTP_ALLOWED_HOSTS: 'mcp.example.com, example.com',
      })
    );

    expect(config.mcpPath).toBe('/mcp-endpoint');
    expect(config.useFields).toBe(true);
    expect(config.maxTokens).toBe(12000);
    expect(config.prefix).toBe('demo_');
    expect(config.enabledToolsets).toEqual(['issue', 'git', 'wiki']);
    expect(config.enableJsonResponse).toBe(true);
    expect(config.allowedHosts).toEqual(['mcp.example.com', 'example.com']);
  });

  it('動的ツールセット有効時はallを除外する', () => {
    const config = resolveWorkerConfig(
      envWith({ ENABLE_DYNAMIC_TOOLSETS: 'true', ENABLE_TOOLSETS: 'all' })
    );

    expect(config.dynamicToolsets).toBe(true);
    expect(config.enabledToolsets).toEqual([]);
  });

  it('不正なMAX_TOKENSはデフォルトにフォールバックする', () => {
    const config = resolveWorkerConfig(envWith({ MAX_TOKENS: 'abc' }));

    expect(config.maxTokens).toBe(50000);
  });
});
