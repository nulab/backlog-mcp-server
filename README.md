# Backlog MCP Server

[![MCP Toplist](https://mcptoplist.com/badge/glama%2Fnulab%2Fbacklog-mcp-server.svg)](https://mcptoplist.com/server/glama%2Fnulab%2Fbacklog-mcp-server)
![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://github.com/nulab/backlog-mcp-server/actions/workflows/ci.yml/badge.svg)
![Last Commit](https://img.shields.io/github/last-commit/nulab/backlog-mcp-server.svg)

[📘 日本語でのご利用ガイド](./README.ja.md)

A Model Context Protocol (MCP) server for interacting with the Backlog API. This server provides tools for managing projects, issues, wiki pages, and more in Backlog through AI agents like Claude Desktop / Cline / Cursor etc.

## Features

- Project tools (create, read, update, delete)
- Issue tracking and comments (create, update, delete, list)
- Version/Milestone management (create, read, update, delete)
- Wiki page support
- Git repository and pull request tools
- Notification tools
- Field selection for optimized responses
- Token limiting for large responses

## Getting Started

### Requirements

- Docker
- A Backlog account with API access
- API key from your Backlog account

### Option 1: Install via Docker

The easiest way to use this MCP server is through MCP configurations:

1. Open MCP settings
2. Navigate to the MCP configuration section
3. Add the following configuration:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "docker",
      "args": [
        "run",
        "--pull",
        "always",
        "-i",
        "--rm",
        "-e",
        "BACKLOG_DOMAIN",
        "-e",
        "BACKLOG_API_KEY",
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key"
      }
    }
  }
}
```

Replace `your-domain.backlog.com` with your Backlog domain and `your-api-key` with your Backlog API key.

✅ If you cannot use --pull always, you can manually update the image using:

```
docker pull ghcr.io/nulab/backlog-mcp-server:latest
```

### Option 2: Install via npx

You can also run the server directly using `npx` without cloning the repository. This is a convenient way to run the server without a full installation.

1. Open MCP settings
2. Navigate to the MCP configuration section
3. Add the following configuration:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["backlog-mcp-server"],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key"
      }
    }
  }
}
```

Replace `your-domain.backlog.com` with your Backlog domain and `your-api-key` with your Backlog API key.

### Option 3: Manual Setup (Node.js)

1. Clone and install:

   ```bash
   git clone https://github.com/nulab/backlog-mcp-server.git
   cd backlog-mcp-server
   pnpm install
   pnpm run build
   ```

2. Create `.env` from template and set required variables:

```bash
cp .env.example .env
```

Set the following values in `.env`:

- `BACKLOG_DOMAIN=your-domain.backlog.com`
- `BACKLOG_API_KEY=your-api-key`

3. Run locally:

```bash
pnpm run dev
```

4. Set your json to use as MCP

```json
{
  "mcpServers": {
    "backlog": {
      "command": "node",
      "args": ["your-repository-location/build/index.js"],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key"
      }
    }
  }
}
```

### HTTP transport (Streamable HTTP)

By default the server uses **stdio**. To run the [MCP Streamable HTTP](https://modelcontextprotocol.io/) transport instead (JSON-RPC over HTTP, same tools as stdio), start with `--transport http` or set `MCP_TRANSPORT=http`.

```bash
pnpm run build
MCP_TRANSPORT=http MCP_HTTP_PORT=3333 node build/index.js
```

- **Endpoint:** `POST` (and `GET` for server-initiated streams) on `http://<host>:<port><path>` (default path `/mcp`).
- **Protocol:** MCP `2026-07-28`. The protocol is stateless: there is no `initialize` handshake and no `mcp-session-id` header. Clients send their metadata in `_meta` on every request and discover capabilities via `server/discover`. Streamable HTTP also requires the `Mcp-Method` header (and `Mcp-Name` on `tools/call`).
- **Backward compatibility:** Clients on `2025-11-25` and earlier are still served over the same endpoint, statelessly. Because no session is kept, the 2025 session operations (`GET` / `DELETE` with an `mcp-session-id`) answer `405`.
- **Security:** Default bind is `127.0.0.1`. On a bare loopback bind, `Host` and `Origin` are both validated against the localhost set (DNS rebinding protection). Behind a reverse proxy, set `--http-allowed-hosts` to the public hostname; that turns off the localhost `Origin` default, since a browser client's `Origin` is its own site and never this server's hostname. Add `--http-allowed-origins` to restrict which client origins may reach the server. Do not expose the HTTP port to untrusted networks without authentication and TLS; it allows full use of your Backlog API key via MCP tools.

Environment variables (CLI flags override when both are set):

| Variable                   | Description                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MCP_TRANSPORT`            | `stdio` (default) or `http`                                                                                                                                                       |
| `MCP_HTTP_HOST`            | Bind address (default `127.0.0.1`)                                                                                                                                                |
| `MCP_HTTP_PORT`            | Port (default `3333`)                                                                                                                                                             |
| `MCP_HTTP_PATH`            | URL path (default `/mcp`)                                                                                                                                                         |
| `MCP_HTTP_JSON_RESPONSE`   | `true` to prefer JSON responses over SSE (applies to `2026-07-28` clients only)                                                                                                   |
| `MCP_HTTP_ALLOWED_HOSTS`   | Comma-separated allowed `Host` hostnames (port-agnostic). Required when binding to `0.0.0.0`; also the escape hatch for a loopback bind behind a proxy (DNS rebinding protection) |
| `MCP_HTTP_ALLOWED_ORIGINS` | Comma-separated allowed `Origin` hostnames for browser-based clients. Defaults to the localhost set on a bare loopback bind, and to no `Origin` check otherwise                   |

### OAuth 2.0 Authentication (Remote MCP)

When exposing the MCP server over a network, you can enable OAuth 2.0 authentication so that each user authenticates with their own Backlog account instead of sharing a single API key.

The server implements the [MCP Third-Party Authorization Flow](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization) by acting as both an OAuth authorization server (for MCP clients) and an OAuth client (for Backlog).

#### Prerequisites

1. Register an OAuth application in your Backlog space:
   - Go to your Backlog space → Personal Settings → Register Application
   - Set the **Redirect URI** to `<MCP_SERVER_BASE_URL>/callback` (e.g., `https://mcp.example.com/callback`)
   - Note the **Client ID** and **Client Secret**

2. Set the following environment variables (in addition to `BACKLOG_DOMAIN`):

| Variable                      | Description                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| `BACKLOG_OAUTH_CLIENT_ID`     | OAuth Client ID from your Backlog application                   |
| `BACKLOG_OAUTH_CLIENT_SECRET` | OAuth Client Secret from your Backlog application               |
| `MCP_SERVER_BASE_URL`         | Public URL of your MCP server (e.g., `https://mcp.example.com`) |

> **Note:** `BACKLOG_API_KEY` is **not required** when OAuth is enabled — each user authenticates with their own Backlog account.

#### Example

```bash
BACKLOG_DOMAIN=your-space.backlog.com \
BACKLOG_OAUTH_CLIENT_ID=your-client-id \
BACKLOG_OAUTH_CLIENT_SECRET=your-client-secret \
MCP_SERVER_BASE_URL=https://mcp.example.com \
node build/index.js --transport http --http-host 0.0.0.0 --http-port 3333 \
  --http-allowed-hosts mcp.example.com
```

`--http-allowed-hosts` is required in practice when binding to `0.0.0.0`: without it there is no DNS rebinding protection, and the server logs a warning at startup.

The server automatically exposes the following OAuth endpoints when OAuth is enabled:

| Endpoint                                        | Description                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /.well-known/oauth-authorization-server`   | OAuth Authorization Server Metadata ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414)) |
| `GET /.well-known/oauth-protected-resource/mcp` | OAuth Protected Resource Metadata ([RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728))   |
| `POST /register`                                | Dynamic Client Registration ([RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591))         |
| `GET /authorize`                                | Authorization endpoint (redirects to Backlog OAuth)                                             |
| `GET /callback`                                 | Backlog OAuth callback                                                                          |
| `POST /token`                                   | Token endpoint (authorization code & refresh token)                                             |

MCP clients that support the MCP authorization specification will use these endpoints automatically.

`POST /register` restricts which redirect URIs a client may register. A loopback
URI (`http://localhost`, `http://127.0.0.1`, `http://[::1]`) is how an app running
on the user's machine receives the authorization code, and is accepted from a
client that declares `"application_type": "native"` — or, when the field is
absent, from one whose redirect URIs are _all_ loopback. A client declaring
`"application_type": "web"`, or mixing a remote `https:` URI with a loopback one
without declaring itself, is rejected with `invalid_client_metadata`.

> **Limitations:**
>
> - OAuth mode currently supports a single Backlog organization. It is not compatible with the multi-organization configuration.
> - Client registrations and tokens are stored in memory and will be lost on server restart.

## Tool Configuration

You can selectively enable or disable specific **toolsets** using the `--enable-toolsets` command-line flag or the `ENABLE_TOOLSETS` environment variable. This allows better control over which tools are available to the AI agent and helps reduce context size.

### Available Toolsets

The following toolsets are available (enabled by default when `"all"` is used):

| Toolset         | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `space`         | Tools for managing Backlog space settings and general information       |
| `project`       | Tools for managing projects, categories, custom fields, and issue types |
| `issue`         | Tools for managing issues and their comments, version milestones        |
| `wiki`          | Tools for managing wiki pages                                           |
| `git`           | Tools for managing Git repositories and pull requests                   |
| `notifications` | Tools for managing user notifications                                   |
| `document`      | Tools for viewing documents and document trees                          |

### Specifying Toolsets

You can control toolset activation in the following ways:

Using via CLI:

```bash
--enable-toolsets space,project,issue
```

Or via environment variable:

```
ENABLE_TOOLSETS="space,project,issue"
```

If all is specified, all available toolsets will be enabled. This is also the default behavior.

Using selective toolsets can be helpful if the toolset list is too large for your AI agent or if certain tools are causing performance issues. In such cases, disabling unused toolsets may improve stability.

> 🧩 Tip: `project` toolset is highly recommended, as many other tools rely on project data as an entry point.

## Available Tools

### Toolset: `space`

Tools for managing Backlog space settings and general information.

- `get_space`: Returns information about the Backlog space.
- `get_users`: Returns list of users in the Backlog space.
- `get_myself`: Returns information about the authenticated user.
- `add_attachment`: Uploads a file and returns its attachment id, for use in the `attachmentId` array of `add_issue`, `update_issue` or `add_issue_comment`. See [Attachment uploads](#attachment-uploads).

### Toolset: `project`

Tools for managing projects, categories, custom fields, and issue types.

- `get_project_list`: Returns list of projects.
- `add_project`: Creates a new project.
- `get_project`: Returns information about a specific project.
- `get_project_users`: Returns list of users in a specific project.
- `update_project`: Updates an existing project.

### Toolset: `issue`

Tools for managing issues, their comments, and related items like priorities, categories, custom fields, issue types, resolutions, and watching lists.

- `get_issue`: Returns information about a specific issue.
- `get_issue_attachment`: Downloads one attachment of an issue. Returns it as image or embedded resource content, or as base64 with `format: "base64"`.
- `get_issues`: Returns list of issues.
- `count_issues`: Returns count of issues.
- `add_issue`: Creates a new issue in the specified project.
- `update_issue`: Updates an existing issue.
- `delete_issue`: Deletes an issue.
- `get_issue_comments`: Returns list of comments for an issue.
- `add_issue_comment`: Adds a comment to an issue.
- `update_issue_comment`: Updates a comment on an issue.
- `get_related_issues`: Returns list of issues related to a specific issue.
- `add_related_issue`: Relates an issue to another issue.
- `remove_related_issue`: Removes the relation between an issue and a related issue.
- `get_priorities`: Returns list of priorities.
- `get_categories`: Returns list of categories for a project.
- `get_custom_fields`: Returns list of custom fields for a project.
- `get_issue_types`: Returns list of issue types for a project.
- `get_resolutions`: Returns list of issue resolutions.
- `get_watching_list_items`: Returns list of watching items for a user.
- `get_watching_list_count`: Returns count of watching items for a user.
- `add_watching`: Adds a new watch to an issue.
- `update_watching`: Updates an existing watch note.
- `delete_watching`: Deletes a watch from an issue.
- `mark_watching_as_read`: Marks a watch as read.
- `get_version_milestone_list`: Returns list of version milestones for a project.
- `add_version_milestone`: Creates a new version milestone for a project.
- `update_version_milestone`: Updates an existing version milestone.
- `delete_version_milestone`: Deletes a version milestone.

### Toolset: `wiki`

Tools for managing wiki pages.

- `get_wiki_pages`: Returns list of Wiki pages.
- `get_wikis_count`: Returns count of wiki pages in a project.
- `get_wiki`: Returns information about a specific wiki page.
- `add_wiki`: Creates a new wiki page.

### Toolset: `git`

Tools for managing Git repositories and pull requests.

- `get_git_repositories`: Returns list of Git repositories for a project.
- `get_git_repository`: Returns information about a specific Git repository.
- `get_pull_requests`: Returns list of pull requests for a repository.
- `get_pull_requests_count`: Returns count of pull requests for a repository.
- `get_pull_request`: Returns information about a specific pull request.
- `add_pull_request`: Creates a new pull request.
- `update_pull_request`: Updates an existing pull request.
- `get_pull_request_comments`: Returns list of comments for a pull request.
- `add_pull_request_comment`: Adds a comment to a pull request.
- `update_pull_request_comment`: Updates a comment on a pull request.

### Toolset: `notifications`

Tools for managing user notifications.

- `get_notifications`: Returns list of notifications.
- `get_notifications_count`: Returns count of notifications.
- `reset_unread_notification_count`: Resets unread notification count.
- `mark_notification_as_read`: Marks a notification as read.

### Toolset: `document`

Tools for managing documents and document trees in Backlog projects.

- `get_document_tree`: Returns the hierarchical tree of documents for a project, including folders and ne
- `get_documents`: Returns a flat list of documents in a project or folder.
- `get_document`: Returns detailed information about a specific document, including metadata, content, an

## Usage Examples

Once the MCP server is configured in AI agents, you can use the tools directly in your conversations. Here are some examples:

- Listing Projects

```
Could you list all my Backlog projects?
```

- Creating a New Issue

```
Create a new bug issue in the PROJECT-KEY project with high priority titled "Fix login page error"
```

- Getting Project Details

```
Show me the details of the PROJECT-KEY project
```

- Working with Git Repositories

```
List all Git repositories in the PROJECT-KEY project
```

- Managing Pull Requests

```
Show me all open pull requests in the repository "repo-name" of PROJECT-KEY project
```

```
Create a new pull request from branch "feature/new-feature" to "main" in the repository "repo-name" of PROJECT-KEY project
```

- Watching Items

```
Show me all items I'm watching
```

### Overriding Tool Descriptions

You can override the descriptions of tools by creating a `.backlog-mcp-serverrc.json` file in your **home directory**.

Almost all of these strings are the tool and parameter descriptions the model reads when it decides which tool to call and how to fill in its arguments, so overriding them is a way to steer tool selection — for example to disambiguate two similar tools, or to add a rule your team follows — rather than a way to change the language of the answers you get. The model answers in whatever language you ask in, regardless of the language these descriptions are written in.

A small number of keys are validation error messages instead (for example `PROJECT_ID_OR_KEY_REQUIRED`). Those are returned in the tool result when a call is rejected, so they can reach you by way of the model's reply.

The file should contain a JSON object with the tool names as keys and the new descriptions as values.  
For example:

```json
{
  "TOOL_ADD_ISSUE_COMMENT_DESCRIPTION": "An alternative description",
  "TOOL_CREATE_PROJECT_DESCRIPTION": "Create a new project in Backlog"
}
```

When the server starts, it determines the final description for each tool based on the following priority:

1. Environment variables (e.g., `BACKLOG_MCP_TOOL_ADD_ISSUE_COMMENT_DESCRIPTION`)
2. Entries in `.backlog-mcp-serverrc.json` - Supported configuration file formats: .json, .yaml, .yml
3. Built-in defaults

Empty or non-string values are ignored at every level, and the built-in default is used instead.

Sample config:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "BACKLOG_DOMAIN",
        "-e",
        "BACKLOG_API_KEY",
        "-v",
        "/yourcurrentdir/.backlog-mcp-serverrc.json:/root/.backlog-mcp-serverrc.json:ro",
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Exporting Current Descriptions

You can export the current descriptions (including any overrides) by running the binary with the `--export-descriptions` flag. This flag was previously called `--export-translations`; the old name still works but prints a deprecation notice and will be removed in a future release.

This prints every key that is resolved while the tool list is built, with its current value, including any customizations you have made. That covers all tool and parameter descriptions, and it is the practical way to discover key names.

It does not cover the validation error messages, because those keys are only resolved when a call is actually rejected. They are still overridable by the same rules; you just have to read them out of the source.

Example:

```bash
docker run -i --rm ghcr.io/nulab/backlog-mcp-server node build/index.js --export-descriptions
```

or

```bash
npx github:nulab/backlog-mcp-server --export-descriptions
```

### Using Environment Variables

Alternatively, you can override tool descriptions via environment variables.

The environment variable names are based on the tool keys, prefixed with BACKLOG*MCP* and written in uppercase.

Example:
To override the TOOL_ADD_ISSUE_COMMENT_DESCRIPTION:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e", "BACKLOG_DOMAIN",
        "-e", "BACKLOG_API_KEY",
        "-e", "BACKLOG_MCP_TOOL_ADD_ISSUE_COMMENT_DESCRIPTION"
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key",
        "BACKLOG_MCP_TOOL_ADD_ISSUE_COMMENT_DESCRIPTION": "An alternative description"
      }
    }
  }
}
```

The server loads the config file synchronously at startup.

Environment variables always take precedence over the config file.

## Advanced Features

### Tool Name Prefixing

Add prefix to tool names with:

```
--prefix backlog_
```

or via environment variable:

```
PREFIX="backlog_"
```

This is especially useful if you're using multiple MCP servers or tools in the same environment and want to avoid name collisions. For example, get_project can become backlog_get_project to distinguish it from similarly named tools provided by other services.

### Response Optimization & Token Limits

#### Field Selection

```
--optimize-response
```

Or environment variable:

```
OPTIMIZE_RESPONSE=1
```

Tools that return a **list** then take an optional `fields` parameter: a list of
top-level field names from that tool's own result, published as an enum so a name
the tool does not have is rejected rather than ignored. Tools that return a single
record do not get it — the parameter costs schema on every session, and one record
has almost nothing to trim.

```
get_project(projectIdOrKey: "PROJECT-KEY", fields: ["name", "key", "description"])
```

Omitting `fields` returns the whole result. Selection is one level deep: naming an
object or array field returns it whole.

Benefits:

- Reduce response size by requesting only needed fields
- Focus on specific data points
- Improve performance for large responses

#### Token Limiting

Large responses are automatically limited to prevent exceeding token limits:

- Default limit: 50,000 tokens
- Configurable via `MAX_TOKENS` environment variable
- Responses exceeding the limit are truncated with a message

You can change this using:

```
MAX_TOKENS=10000
```

If a response exceeds the limit, it will be truncated with a warning.

> Note: This is a best-effort mitigation, not a guaranteed enforcement.

### Attachment uploads

`add_attachment` is the only tool that reads the host's filesystem. It takes a `filePath`, uploads that file to the space and returns `{ id, name, size }`; the id is what `add_issue`, `update_issue` and `add_issue_comment` accept in `attachmentId`, since those tools attach existing uploads rather than performing one.

The path is resolved **on the machine running the server**, not on the client:

- With the stdio/npx setup the two are the same machine, so a local path works as written.
- In the container image they are not. Bind-mount the directory first (`-v /host/dir:/data`) and pass the path inside the container.

| Variable                    | Description                                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BACKLOG_ATTACHMENT_ROOTS`  | Directories `add_attachment` may read from, separated by the platform's path delimiter (`:` on Unix, `;` on Windows). Unset means no restriction. |

Symlinks are resolved before the check, so a link inside an allowed directory cannot be used to reach a file outside it.

```
BACKLOG_ATTACHMENT_ROOTS=/srv/uploads:/tmp/backlog-in
```

### Logging

The server logs to **stderr** (stdout carries the JSON-RPC stream on the stdio transport).

| Variable    | Description                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`. Defaults to `error` when `NODE_ENV` is `production` — which is also the default when `NODE_ENV` is unset — and to `debug` otherwise. An unrecognised value is reported and the default is used. |

`NODE_ENV` still selects the output *format*: any value other than `production` switches to human-readable `pino-pretty` output when that package is available. Use `LOG_LEVEL`, not `NODE_ENV`, to change how much is logged, so that a deployment keeps structured JSON:

`pino-pretty` is a development dependency, so neither the published npm package nor the container image carries a copy. In those, logs are structured JSON whatever `NODE_ENV` says, and `LOG_LEVEL` is the only setting that changes the output.

```
LOG_LEVEL=info node build/index.js --transport http
```

### Full Custom Configuration Example

This section demonstrates advanced configuration using multiple environment variables. These are experimental features and may not be supported across all MCP clients. This is not part of the MCP standard specification and should be used with caution.

```json
{
  "mcpServers": {
    "backlog": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "BACKLOG_DOMAIN",
        "-e",
        "BACKLOG_API_KEY",
        "-e",
        "MAX_TOKENS",
        "-e",
        "OPTIMIZE_RESPONSE",
        "-e",
        "PREFIX",
        "-e",
        "ENABLE_TOOLSETS",
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key",
        "MAX_TOKENS": "10000",
        "OPTIMIZE_RESPONSE": "1",
        "PREFIX": "backlog_",
        "ENABLE_TOOLSETS": "space,project,issue"
      }
    }
  }
}
```

## Development

### Running Tests

```bash
pnpm test
```

### Adding New Tools

1. Create a new file in `src/tools/` following the pattern of existing tools
2. Create a corresponding test file
3. Add the new tool to `src/tools/tools.ts`
4. Build and test your changes

### Command Line Options

The server supports several command line options:

- `--transport stdio|http`: MCP transport (default: stdio). Use `http` for Streamable HTTP.
- `--http-host`, `--http-port`, `--http-path`: HTTP bind address, port, and path (defaults: `127.0.0.1`, `3333`, `/mcp`).
- `--http-json-response`: Prefer JSON responses over SSE. Applies to `2026-07-28` clients only; the backward-compatible `2025-11-25` path is served with the SDK's default response shaping.
- `--http-allowed-hosts`: Comma-separated allowed `Host` hostnames (port-agnostic). Needed when binding to all interfaces, or on a loopback bind behind a reverse proxy.
- `--http-allowed-origins`: Comma-separated allowed `Origin` hostnames for browser-based clients. Defaults to the localhost set on a bare loopback bind, and to no `Origin` check otherwise.
- `--export-descriptions`: Export the description keys and values resolved when building the tool list. Was named `--export-translations`; that spelling still works as a deprecated alias and will be removed in a future release
- `--optimize-response`: Add a `fields` parameter to each tool for selecting which result fields to return
- `--max-tokens=NUMBER`: Set maximum token limit for responses
- `--prefix=STRING`: Optional string prefix to prepend to all tool names (default: "")
- `--enable-toolsets <toolsets...>`: Specify which toolsets to enable (comma-separated or multiple arguments). Defaults to "all".
  Example: `--enable-toolsets space,project` or `--enable-toolsets issue --enable-toolsets git`
  Available toolsets: `space`, `project`, `issue`, `wiki`, `git`, `notifications`.

Example:

```bash
node build/index.js --optimize-response --max-tokens=100000 --prefix="backlog_" --enable-toolsets space,issue
```

HTTP example:

```bash
node build/index.js --transport http --http-port 3333 --http-path /mcp
```

## Multi-Organization Support

This server can be configured to access multiple Backlog organizations from a single MCP server instance.

### Configuration

Configure one env pair per organization and set a default organization:

```bash
BACKLOG_DEFAULT_ORG=COMPANY_A
BACKLOG_ORG_COMPANY_A_DOMAIN=company-a.backlog.com
BACKLOG_ORG_COMPANY_A_API_KEY=your-company-a-api-key
BACKLOG_ORG_COMPANY_B_DOMAIN=company-b.backlog.com
BACKLOG_ORG_COMPANY_B_API_KEY=your-company-b-api-key
```

This works whether the variables come from a local `.env`, your shell environment, or an MCP client config `env` block.

Example MCP config:

```json
{
  "env": {
    "BACKLOG_DEFAULT_ORG": "COMPANY_A",
    "BACKLOG_ORG_COMPANY_A_DOMAIN": "company-a.backlog.com",
    "BACKLOG_ORG_COMPANY_A_API_KEY": "your-company-a-api-key",
    "BACKLOG_ORG_COMPANY_B_DOMAIN": "company-b.backlog.com",
    "BACKLOG_ORG_COMPANY_B_API_KEY": "your-company-b-api-key"
  }
}
```

If no multi-organization env vars are set, the server falls back to the existing single-organization configuration:

```bash
BACKLOG_DOMAIN=your-domain.backlog.com
BACKLOG_API_KEY=your-api-key
```

### Tool Usage

When multi-organization env vars are configured, all normal tools accept an optional `organization` input field. When provided, the tool call is routed to that Backlog organization.

In single-organization mode the field is not published, since there would be only one organization to route to. Omitting it keeps roughly 8 KB of tool schema out of every `tools/list` response.

Examples:

```json
{
  "organization": "COMPANY_B",
  "projectKey": "PROJECT"
}
```

If `organization` is omitted:

- the organization named by `BACKLOG_DEFAULT_ORG` is used
- if multi-organization env vars are present and `BACKLOG_DEFAULT_ORG` is missing, the server fails at startup

### Organization Discovery

In multi-organization mode the server provides a `list_organizations` tool that returns the configured organization names, their domains, and which one is the default. It is not registered in single-organization mode.

Example response:

```json
[
  {
    "name": "COMPANY_A",
    "domain": "company-a.backlog.com",
    "isDefault": true
  },
  {
    "name": "COMPANY_B",
    "domain": "company-b.backlog.com",
    "isDefault": false
  }
]
```

### Notes

- For multi-org mode, every organization must define both `BACKLOG_ORG_<NAME>_DOMAIN` and `BACKLOG_ORG_<NAME>_API_KEY`.
- The `<NAME>` part is the organization name exposed through the `organization` tool input and `list_organizations`.

## License

This project is licensed under the [MIT License](./LICENSE).

Please note: This tool is provided under the MIT License **without any warranty or official support**.  
Use it at your own risk after reviewing the contents and determining its suitability for your needs.  
If you encounter any issues, please report them via [GitHub Issues](../../issues).
