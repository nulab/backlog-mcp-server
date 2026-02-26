---
name: implement-backlog-api-tool
description: Implements a new MCP tool for a Backlog API endpoint from its documentation URL (e.g. https://developer.nulab.com/docs/backlog/api/2/get-space/). Use this skill when you need to add or update a tool in this MCP server based on a Backlog API spec.
---

# Implement a Backlog API Tool

## Overview

Implement a new MCP tool for the Backlog API endpoint documented at $ARGUMENTS.

## Steps

### 1. Read the API spec

Fetch the documentation page and extract the following:

```bash
curl -s "$ARGUMENTS" | sed 's/<[^>]*>//g' | sed '/^[[:space:]]*$/d'
```

Identify:

- **HTTP Method** – `GET`, `POST`, `PATCH`, `DELETE`, etc.
- **Endpoint path** – e.g. `/api/v2/space`
- **Parameters** – name, type, required/optional, description
- **Response fields** – JSON structure returned by the API

### 2. Check the backlog-js client

Verify the corresponding method exists in the `backlog-js` client:

```bash
grep -r "<methodName>" node_modules/backlog-js/dist
```

Use the client method name and its type signatures as the basis for implementation.

### 3. Read an existing similar tool for reference

```bash
cat src/tools/getSpace.ts
cat src/handlers/transformers/getSpaceTransformer.ts
```

### 4. Implement the tool

Create or update these files following the existing patterns:

#### `src/tools/<toolName>.ts`

- Define the tool name, description, and input schema using `zod`
- Map each API parameter to a zod field with an appropriate description

#### `src/handlers/transformers/<toolName>Transformer.ts` (if needed)

- Transform the raw API response into an MCP-friendly format

#### `src/tools/tools.ts`

- Register the new tool so it is picked up by the server
