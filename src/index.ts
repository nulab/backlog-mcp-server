#!/usr/bin/env node
// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import * as backlogjs from 'backlog-js';
import dotenv from 'dotenv';
import { default as env } from 'env-var';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createTranslationHelper } from './createTranslationHelper.js';
import { registerDyamicTools, registerTools } from './registerTools.js';
import { dynamicTools } from './tools/dynamicTools/toolsets.js';
import { createToolRegistrar } from './utils/toolRegistrar.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import { wrapServerWithToolRegistry } from './utils/wrapServerWithToolRegistry.js';
import { VERSION } from './version.js';

dotenv.config();

const domain = env.get('BACKLOG_DOMAIN').required().asString();

const apiKey = env.get('BACKLOG_API_KEY').required().asString();

const backlog = new backlogjs.Backlog({ host: domain, apiKey: apiKey });

const argv = yargs(hideBin(process.argv))
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
    describe: `Specify which toolsets to enable. Defaults to 'all'.
Available toolsets:
  - space:       Tools for managing Backlog space settings and general information
  - project:     Tools for managing projects, categories, custom fields, and issue types
  - issue:       Tools for managing issues and their comments
  - wiki:        Tools for managing wiki pages
  - git:         Tools for managing Git repositories and pull requests
  - notifications: Tools for managing user notifications`,
    default: env.get('ENABLE_TOOLSETS').default('all').asArray(','),
  })
  .option('dynamic-toolsets', {
    type: 'boolean',
    describe:
      'Enable dynamic toolsets such as enable_toolset, list_available_toolsets, etc.',
    default: env.get('ENABLE_DYNAMIC_TOOLSETS').default('false').asBool(),
  })
  .option('transport', {
    type: 'string',
    choices: ['stdio', 'sse'] as const,
    describe: 'Transport protocol to use',
    default: env.get('TRANSPORT').default('stdio').asString(),
  })
  .option('port', {
    type: 'number',
    describe: 'Port for SSE server (when transport=sse)',
    default: env.get('PORT').default('3000').asIntPositive(),
  })
  .option('endpoint', {
    type: 'string',
    describe: 'Endpoint for SSE messages (when transport=sse)',
    default: env.get('ENDPOINT').default('/message').asString(),
  })
  .parseSync();

const useFields = argv.optimizeResponse;

const server = wrapServerWithToolRegistry(
  new McpServer({
    name: 'backlog',
    description: useFields
      ? `You can include only the fields you need using GraphQL-style syntax.
Start with the example above and customize freely.`
      : undefined,
    version: VERSION,
  })
);

const transHelper = createTranslationHelper();

const maxTokens = argv.maxTokens;
const prefix = argv.prefix;
let enabledToolsets = argv.enableToolsets as string[];

// If dynamic toolsets are enabled, remove "all" to allow for selective enabling via commands
if (argv.dynamicToolsets) {
  enabledToolsets = enabledToolsets.filter((a) => a != 'all');
}

const mcpOption = { useFields: useFields, maxTokens, prefix };
const toolsetGroup = buildToolsetGroup(backlog, transHelper, enabledToolsets);

// Register all tools
registerTools(server, toolsetGroup, mcpOption);

// Register dynamic tool management tools if enabled
if (argv.dynamicToolsets) {
  const registrar = createToolRegistrar(server, toolsetGroup, mcpOption);
  const dynamicToolsetGroup = dynamicTools(
    registrar,
    transHelper,
    toolsetGroup
  );

  registerDyamicTools(server, dynamicToolsetGroup, prefix);
}

if (argv.exportTranslations) {
  const data = transHelper.dump();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

function setCORSHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : undefined;
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function main() {
  if (argv.transport === 'sse') {
    const port = argv.port;
    const endpoint = argv.endpoint;
    
    // Store active SSE transports by session ID
    const activeTransports = new Map<string, SSEServerTransport>();
    
    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      setCORSHeaders(res);
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      const url = new URL(req.url || '/', `http://localhost:${port}`);
      
      if (url.pathname === '/' && req.method === 'GET') {
        try {
          const transport = new SSEServerTransport(endpoint, res);
          await server.connect(transport);
          
          // Store the transport for handling POST requests
          activeTransports.set(transport.sessionId, transport);
          
          // Clean up when connection closes
          transport.onclose = () => {
            activeTransports.delete(transport.sessionId);
          };
        } catch (error) {
          console.error('Error establishing SSE connection:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to establish SSE connection' }));
        }
      } else if (url.pathname === endpoint && req.method === 'POST') {
        try {
          const sessionId = url.searchParams.get('sessionId');
          if (!sessionId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing sessionId parameter' }));
            return;
          }
          
          const transport = activeTransports.get(sessionId);
          if (!transport) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Session not found' }));
            return;
          }
          
          const body = await parseJsonBody(req);
          await transport.handlePostMessage(req, res, body);
        } catch (error) {
          console.error('Error handling POST request:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
    
    httpServer.listen(port, () => {
      console.error(`Backlog MCP Server running on SSE at http://localhost:${port}`);
      console.error(`Connect to: http://localhost:${port}/`);
      console.error(`Send messages to: http://localhost:${port}${endpoint}?sessionId=<SESSION_ID>`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Backlog MCP Server running on stdio');
  }
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
