# Backlog MCP Server

![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://github.com/nulab/backlog-mcp-server/actions/workflows/ci.yml/badge.svg)
![Last Commit](https://img.shields.io/github/last-commit/nulab/backlog-mcp-server.svg)

[📘 日本語でのご利用ガイド](./README.ja.md) 

A Model Context Protocol (MCP) server for interacting with the Backlog API. This server provides tools for managing projects, issues, wiki pages, and more in Backlog through AI agents like Claude Desktop / Cline / Cursor etc.

## Features

- Project tools (create, read, update, delete)
- Issue tracking and comments (create, update, delete, list)
- Wiki page support
- Git repository and pull request tools
- Notification tools
- GraphQL-style field selection for optimized responses
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
        "--pull", "always",
        "-i",
        "--rm",
        "-e", "BACKLOG_DOMAIN",
        "-e", "BACKLOG_API_KEY",
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
      "args": [
        "backlog-mcp-server"
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

### Option 3: Manual Setup (Node.js)

1. Clone and install:
   ```bash
   git clone https://github.com/nulab/backlog-mcp-server.git
   cd backlog-mcp-server
   npm install
   npm run build
   ```

2. Set your json to use as MCP
  ```json
  {
    "mcpServers": {
      "backlog": {
        "command": "node",
        "args": [
          "your-repository-location/build/index.js"
        ],
        "env": {
          "BACKLOG_DOMAIN": "your-domain.backlog.com",
          "BACKLOG_API_KEY": "your-api-key"
        }
      }
    }
  }
  ```

## Tool Configuration

You can selectively enable or disable specific **toolsets** using the `--enable-toolsets` command-line flag or the `ENABLE_TOOLSETS` environment variable. This allows better control over which tools are available to the AI agent and helps reduce context size.

### Available Toolsets

The following toolsets are available (enabled by default when `"all"` is used):

| Toolset         | Description                                                                          |
|-----------------|--------------------------------------------------------------------------------------|
| `space`         | Tools for managing Backlog space settings and general information                   |
| `project`       | Tools for managing projects, categories, custom fields, and issue types              |
| `issue`         | Tools for managing issues and their comments                                         |
| `wiki`          | Tools for managing wiki pages                                                        |
| `git`           | Tools for managing Git repositories and pull requests                                |
| `notifications` | Tools for managing user notifications                                                |
| `document`      | Tools for viewing documents and document trees                   |

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

### Dynamic Toolset Discovery (Experimental)

If you're using the MCP server with AI agents, you can enable dynamic discovery of toolsets at runtime:

Enabling via CLI:

```
--dynamic-toolsets
```

Or via environment variable::

```
-e DYNAMIC_TOOLSETS=1 \
```

With dynamic toolsets enabled, the LLM will be able to list and activate toolsets on demand via tool interface.

## Available Tools

### Toolset: `space`
Tools for managing Backlog space settings and general information.
- `get_space`: Returns information about the Backlog space.
- `get_users`: Returns list of users in the Backlog space.
- `get_myself`: Returns information about the authenticated user.

### Toolset: `project`
Tools for managing projects, categories, custom fields, and issue types.
- `get_project_list`: Returns list of projects.
- `add_project`: Creates a new project.
- `get_project`: Returns information about a specific project.
- `update_project`: Updates an existing project.
- `delete_project`: Deletes a project.

### Toolset: `issue`
Tools for managing issues, their comments, and related items like priorities, categories, custom fields, issue types, resolutions, and watching lists.
- `get_issue`: Returns information about a specific issue.
- `get_issues`: Returns list of issues.
- `count_issues`: Returns count of issues.
- `add_issue`: Creates a new issue in the specified project.
- `update_issue`: Updates an existing issue.
- `delete_issue`: Deletes an issue.
- `get_issue_comments`: Returns list of comments for an issue.
- `add_issue_comment`: Adds a comment to an issue.
- `get_priorities`: Returns list of priorities.
- `get_categories`: Returns list of categories for a project.
- `get_custom_fields`: Returns list of custom fields for a project.
- `get_issue_types`: Returns list of issue types for a project.
- `get_resolutions`: Returns list of issue resolutions.
- `get_watching_list_items`: Returns list of watching items for a user.
- `get_watching_list_count`: Returns count of watching items for a user.

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

### i18n / Overriding Descriptions

You can override the descriptions of tools by creating a `.backlog-mcp-serverrc.json` file in your **home directory**.

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
3. Built-in fallback values (English)

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
        "-e", "BACKLOG_DOMAIN",
        "-e", "BACKLOG_API_KEY",
        "-v", "/yourcurrentdir/.backlog-mcp-serverrc.json:/root/.backlog-mcp-serverrc.json:ro",
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

### Exporting Current Translations

You can export the current default translations (including any overrides) by running the binary with the --export-translations flag.

This will print all tool descriptions to stdout, including any customizations you have made.

Example:

```bash
docker run -i --rm ghcr.io/nulab/backlog-mcp-server node build/index.js --export-translations
```

or 

```bash
npx github:nulab/backlog-mcp-server --export-translations
```

### Using a Japanese Translation Template
A sample Japanese configuration file is provided at:

```bash
translationConfig/.backlog-mcp-serverrc.json.example
```

To use it, copy it to your home directory as .backlog-mcp-serverrc.json:

You can then edit the file to customize the descriptions as needed.

### Using Environment Variables
Alternatively, you can override tool descriptions via environment variables.

The environment variable names are based on the tool keys, prefixed with BACKLOG_MCP_ and written in uppercase.

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

#### Field Selection (GraphQL-style)

```
--optimize-response
```

Or environment variable:

```
OPTIMIZE_RESPONSE=1
```

Then, request only specific fields:

```
get_project(projectIdOrKey: "PROJECT-KEY", fields: "{ name key description }")
```

The AI will use field selection to optimize the response:

```
get_project(projectIdOrKey: "PROJECT-KEY", fields: "{ name key description }")
```

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
        "-e", "BACKLOG_DOMAIN",
        "-e", "BACKLOG_API_KEY",
        "-e", "MAX_TOKENS",
        "-e", "OPTIMIZE_RESPONSE",
        "-e", "PREFIX",
        "-e", "ENABLE_TOOLSETS",
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key",
        "MAX_TOKENS": "10000",
        "OPTIMIZE_RESPONSE": "1",
        "PREFIX": "backlog_",
        "ENABLE_TOOLSETS": "space,project,issue",
        "ENABLE_DYNAMIC_TOOLSETS": "1"
      }
    }
  }
}
```

## Development

### Running Tests

```bash
npm test
```

### Adding New Tools

1. Create a new file in `src/tools/` following the pattern of existing tools
2. Create a corresponding test file
3. Add the new tool to `src/tools/tools.ts`
4. Build and test your changes

### Command Line Options

The server supports several command line options:

- `--export-translations`: Export all translation keys and values
- `--optimize-response`: Enable GraphQL-style field selection
- `--max-tokens=NUMBER`: Set maximum token limit for responses
- `--prefix=STRING`: Optional string prefix to prepend to all tool names (default: "")
- `--enable-toolsets <toolsets...>`: Specify which toolsets to enable (comma-separated or multiple arguments). Defaults to "all".
  Example: `--enable-toolsets space,project` or `--enable-toolsets issue --enable-toolsets git`
  Available toolsets: `space`, `project`, `issue`, `wiki`, `git`, `notifications`.

Example:
```bash
node build/index.js --optimize-response --max-tokens=100000 --prefix="backlog_" --enable-toolsets space,issue
```

## License

This project is licensed under the [MIT License](./LICENSE).

Please note: This tool is provided under the MIT License **without any warranty or official support**.  
Use it at your own risk after reviewing the contents and determining its suitability for your needs.  
If you encounter any issues, please report them via [GitHub Issues](../../issues).
