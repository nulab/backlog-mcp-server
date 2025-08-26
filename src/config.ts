// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import dotenv from 'dotenv';
import { default as env } from 'env-var';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { VERSION } from './version.js';

dotenv.config();

// Define Read Guard policies
const READ_GUARD_POLICIES = ['off', 'filter', 'deny'] as const;
export type ReadGuardPolicy = (typeof READ_GUARD_POLICIES)[number];

// Define Write Guard policies
const WRITE_GUARD_POLICIES = ['on', 'off'] as const;
export type WriteGuardPolicy = (typeof WRITE_GUARD_POLICIES)[number];

export const config = yargs(hideBin(process.argv))
  .option('backlog-domain', {
    type: 'string',
    describe: 'Backlog domain',
    default: env.get('BACKLOG_DOMAIN').required().asString(),
  })
  .option('backlog-api-key', {
    type: 'string',
    describe: 'Backlog API key',
    default: env.get('BACKLOG_API_KEY').required().asString(),
  })
  .option('max-tokens', {
    type: 'number',
    describe: 'Maximum number of tokens allowed in the response',
    default: env.get('MAX_TOKENS').default('50000').asIntPositive(),
  })
  .option('optimize-response', {
    type: 'boolean',
    describe:
      'Enable GraphQL-style response optimization to include only requested fields',
    default: env.get('OPTIMIZE_RESPONSE').default('false').asBool(),
  })
  .option('prefix', {
    type: 'string',
    describe: 'Optional string prefix to prepend to all generated outputs',
    default: env.get('PREFIX').default('').asString(),
  })
  .option('export-translations', {
    type: 'boolean',
    describe: 'Export translations and exit',
    default: false,
  })
  .option('enable-toolsets', {
    type: 'array',
    describe: `Specify which toolsets to enable. Defaults to 'all'.`,
    default: env.get('ENABLE_TOOLSETS').default('all').asArray(','),
  })
  .option('dynamic-toolsets', {
    type: 'boolean',
    describe:
      'Enable dynamic toolsets such as enable_toolset, list_available_toolsets, etc.',
    default: env.get('ENABLE_DYNAMIC_TOOLSETS').default('false').asBool(),
  })
  .option('allowed-project-ids', {
    type: 'array',
    describe: 'Comma-separated list of allowed Backlog project IDs',
    default: env.get('BACKLOG_ALLOWED_PROJECT_IDS').default('').asArray(',').filter(Boolean),
  })
  .option('allowed-project-keys', {
    type: 'array',
    describe: 'Comma-separated list of allowed Backlog project keys',
    default: env.get('BACKLOG_ALLOWED_PROJECT_KEYS').default('').asArray(',').filter(Boolean),
  })
  .option('key-resolve-ttl-sec', {
    type: 'number',
    describe: 'Cache TTL in seconds for project key-to-ID resolution',
    default: env.get('BACKLOG_KEY_RESOLVE_TTL_SEC').default(300).asInt(),
  })
  .version(VERSION)
  .help()
  .alias('h', 'help')
  .parseSync();
