# `get_issue_attachment`

## Overview

`get_issue` returns attachment metadata, but not the attachment body. The
`get_issue_attachment` tool downloads one issue attachment through the Backlog
API and returns its binary content through MCP.

- Backlog API: `GET /api/v2/issues/:issueIdOrKey/attachments/:attachmentId`
- backlog-js method: `getIssueAttachment(issueIdOrKey, attachmentId)`
- Toolset: `issue`

The tool does not write to the MCP server's filesystem. This keeps its behavior
consistent across stdio, Docker, and Streamable HTTP transports, and preserves
the tool-layer package's compatibility with non-Node runtimes.

## Input

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `issueId` | number | One of `issueId` or `issueKey` | Numeric issue ID |
| `issueKey` | string | One of `issueId` or `issueKey` | Issue key, for example `PROJ-123` |
| `attachmentId` | positive integer | Yes | Attachment ID from the `attachments` array returned by `get_issue` |
| `maxBytes` | positive integer | No | Raw attachment byte limit. Defaults to 5 MiB and cannot exceed 7 MiB |

## Output

The response contains two MCP content blocks:

1. A text block with `filename`, `mimeType`, `sizeBytes`, `attachmentId`, and
   `issueIdOrKey` metadata.
2. The attachment body:
   - supported raster images are returned as MCP `image` content;
   - all other files are returned as an embedded MCP `resource` with a base64
     `blob`.

Embedded resources use a synthetic `backlog://` URI namespaced by the Backlog
hostname. The tool intentionally discards the path and query from the response
URL returned by backlog-js because they may contain authentication parameters.

Filenames are percent-decoded when possible. Path separators and control
characters are removed before the filename is included in metadata or the
synthetic URI.

If an attachment exceeds `maxBytes`, the tool stops reading the response and
returns an MCP error instead of sending an unexpectedly large payload. The 7 MiB
hard limit also keeps the base64-expanded result below the MCP SDK's default
10 MiB stdio message limit.

## Usage

1. Call `get_issue` with an issue ID or a sample key such as `PROJ-123`.
2. Select an attachment ID from the returned `attachments` array.
3. Call `get_issue_attachment` with the same issue identifier and the selected
   attachment ID.

The MCP client decides how to display or persist the returned image or embedded
resource.
