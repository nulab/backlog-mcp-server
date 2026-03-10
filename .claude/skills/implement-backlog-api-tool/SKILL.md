---
name: implement-backlog-api-tool
description: Implements a new MCP tool for a Backlog API endpoint from its documentation URL (e.g. https://developer.nulab.com/docs/backlog/api/2/get-space/). Use this skill when you need to add or update a tool in this MCP server based on a Backlog API spec.
---

# Implement a Backlog API Tool

## Overview

Implement a new MCP tool for the Backlog API endpoint documented at $ARGUMENTS.

## Steps

### 1. Read the API spec

Fetch the documentation page using the `fetch_webpage` tool with the URL `$ARGUMENTS` and extract the following:

Identify:

- **HTTP Method** – `GET`, `POST`, `PATCH`, `DELETE`, etc.
- **Endpoint path** – e.g. `/api/v2/space`
- **Parameters** – name, type, required/optional, description
- **Response fields** – JSON structure returned by the API

### 2. Check the backlog-js client

Find the corresponding method in the `backlog-js` type definitions:

```bash
grep "methodName" node_modules/backlog-js/dist/types/backlog.d.ts
```

Replace `methodName` with the actual method name (e.g. `getSpace`, `postIssue`). If unsure of the name, read the full file to browse all available methods:

```bash
cat node_modules/backlog-js/dist/types/backlog.d.ts
```

Use the method's name and type signature as the basis for implementation.

### 3. Read an existing similar tool for reference

```bash
cat src/tools/getSpace.ts
cat src/handlers/builders/composeToolHandler.ts
```

### 4. Implement the tool

Create or update these files following the existing patterns:

#### `src/tools/<toolName>.ts`

- Define the tool name, description, and input schema using `zod`
- Map each API parameter to a zod field with an appropriate description
- Set `outputSchema` to a Zod schema matching the API response shape (see `src/types/zod/backlogOutputDefinition.ts`)
- Set `importantFields` to the subset of fields that are most relevant to the user
- Implement `handler` to call the corresponding `backlog-js` client method

#### `src/tools/tools.ts`

- Register the new tool so it is picked up by the server
