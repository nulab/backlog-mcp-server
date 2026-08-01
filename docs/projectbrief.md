# Project Overview

## Purpose

- Build an MCP server that exposes the Backlog API to MCP clients
- Use backlog-js for connecting to Backlog
- The BacklogJS interface is published [here](https://github.com/nulab/backlog-js/blob/master/src/backlog.ts)

## Implementation Approach

- Create tools corresponding to each API endpoint and place them in `./src/tools/${endpointName}.ts`
- Write endpoint names in camelCase (e.g., `getProjectList`)
- Create corresponding test files (`${endpointName}.test.ts`) for each tool
- Register every tool into a toolset (`space`, `project`, `issue`, `wiki`, `git`, `document`, `notifications`) in `src/tools/tools.ts`
- Refer to the API endpoints listed in URLlist.md for implementation

## Basic Tool Structure

1. Tool Definition
   - Name: Name representing the API endpoint (e.g., `get_space`)
   - Description: Description of the tool's functionality (in English)
   - Schema: Definition of input parameters (using Zod)
   - OutputSchema / ImportantFields: Used by the optional field-selection feature
   - Handler: Function that performs the actual processing

2. Internationalization
   - Descriptions are defined in a translatable format
   - Descriptions can be customized via the `.backlog-mcp-serverrc.json` file

3. Testing
   - Create test files corresponding to each tool
   - Use mocks to simulate Backlog API calls

## Transports and Authentication

- **stdio** (default): authenticated with `BACKLOG_API_KEY`
- **Streamable HTTP** (`--transport http`): can additionally run as an OAuth 2.1 authorization
  server in front of Backlog OAuth (`src/auth/`), issuing per-user Backlog access tokens

## Deployment Method

- Provided as a Docker container, published to GitHub Container Registry (ghcr.io)
- Also runnable directly via `npx backlog-mcp-server` or `node build/index.js`
- Configuration injected via environment variables and CLI flags

## Usage

- Register as an MCP server in the client's settings
- Set necessary environment variables when running Docker
- Multi-language support available through translation files
