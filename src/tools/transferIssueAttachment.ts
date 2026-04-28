import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, DynamicToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';
import { streamToBuffer } from '../utils/streamToBuffer.js';
import { tryDecodeFilename } from '../utils/buildFileContent.js';
import { getMimeType } from '../utils/getMimeType.js';
import { Buffer } from 'node:buffer';
import * as https from 'node:https';
import * as http from 'node:http';
import { URL } from 'node:url';

const transferIssueAttachmentSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_TRANSFER_ISSUE_ATTACHMENT_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_TRANSFER_ISSUE_ATTACHMENT_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  attachmentId: z
    .number()
    .describe(
      t(
        'TOOL_TRANSFER_ISSUE_ATTACHMENT_ATTACHMENT_ID',
        'The numeric ID of the attachment to transfer'
      )
    ),
  destinationUrl: z
    .string()
    .url()
    .describe(
      t(
        'TOOL_TRANSFER_ISSUE_ATTACHMENT_DESTINATION_URL',
        'The URL of the destination endpoint to POST the file to (e.g., a Plane, Notion, or any REST API upload endpoint)'
      )
    ),
  fieldName: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_TRANSFER_ISSUE_ATTACHMENT_FIELD_NAME',
        "The multipart form field name for the file. Defaults to 'file'."
      )
    ),
  headers: z
    .record(z.string())
    .optional()
    .describe(
      t(
        'TOOL_TRANSFER_ISSUE_ATTACHMENT_HEADERS',
        'Optional HTTP headers to include in the destination request (e.g., Authorization, X-API-Key).'
      )
    ),
  extraFields: z
    .record(z.string())
    .optional()
    .describe(
      t(
        'TOOL_TRANSFER_ISSUE_ATTACHMENT_EXTRA_FIELDS',
        'Optional additional multipart form fields to include alongside the file (e.g., project_id, entity_type).'
      )
    ),
  responseJsonPath: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_TRANSFER_ISSUE_ATTACHMENT_RESPONSE_JSON_PATH',
        "Dot-notation path to extract a value from the JSON response (e.g., 'id' or 'data.asset_id'). If set, the extracted value is returned alongside the full response."
      )
    ),
  requestMode: z
    .enum(['multipart', 'json_rpc'])
    .optional()
    .describe(
      t(
        'TOOL_TRANSFER_ISSUE_ATTACHMENT_REQUEST_MODE',
        [
          'How to send the file to the destination.',
          "'multipart' (default): sends as multipart/form-data POST — works with most REST upload APIs.",
          "'json_rpc': sends as a JSON-RPC 2.0 POST with the file encoded as base64 in the params.",
          "  Use 'json_rpc' for Plane MCP (upload_inline_image):",
          "    destinationUrl: 'https://<plane-host>/mcp'",
          "    headers: { 'Authorization': 'Bearer <plane-api-key>', 'X-Workspace-Slug': '<slug>' }",
          "    extraFields: { 'method': 'tools/call', 'toolName': 'upload_inline_image', 'project_id': '<plane-project-id>' }",
          "    responseJsonPath: 'result.content.0.text'",
        ].join('\n')
      )
    ),
}));

function getNestedValue(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce(
      (cur, key) =>
        cur !== null && typeof cur === 'object'
          ? (cur as Record<string, unknown>)[key]
          : undefined,
      obj
    );
}

function buildMultipartBody(
  filename: string,
  mimeType: string,
  fileBuffer: Buffer,
  fieldName: string,
  extraFields: Record<string, string>,
  boundary: string
): Buffer {
  const parts: Buffer[] = [];

  for (const [key, value] of Object.entries(extraFields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      )
    );
  }

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
  );
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  return Buffer.concat(parts);
}

function postJson(
  url: string,
  body: string,
  headers: Record<string, string>
): Promise<{ statusCode: number; body: string }> {
  const bodyBuffer = Buffer.from(body, 'utf-8');
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqHeaders: Record<string, string | number> = {
      ...headers,
      'Content-Type': 'application/json',
      'Content-Length': bodyBuffer.length,
    };

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: reqHeaders,
    };

    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf-8'),
        })
      );
    });

    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

function postMultipart(
  url: string,
  body: Buffer,
  boundary: string,
  headers: Record<string, string>
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqHeaders: Record<string, string | number> = {
      ...headers,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    };

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: reqHeaders,
    };

    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf-8'),
        })
      );
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export const transferIssueAttachmentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): DynamicToolDefinition<ReturnType<typeof transferIssueAttachmentSchema>> => {
  return {
    name: 'transfer_issue_attachment',
    description: t(
      'TOOL_TRANSFER_ISSUE_ATTACHMENT_DESCRIPTION',
      [
        'Downloads an attachment from a Backlog issue and uploads it directly to any HTTP endpoint as multipart/form-data.',
        'Useful for transferring files to third-party platforms without passing base64 through the AI context.',
        '',
        'Example — upload to Plane self-hosted (upload_inline_image via MCP JSON-RPC):',
        '  destinationUrl: "https://<your-plane-host>/mcp"',
        '  fieldName: "file_base64"  — NOTE: Plane MCP does NOT use multipart; use transfer only for REST endpoints.',
        '',
        'Example — upload to Plane REST asset endpoint:',
        '  destinationUrl: "https://<your-plane-host>/api/assets/v2/workspaces/<workspace-slug>/projects/<project-id>/"',
        '  headers: { "X-API-Key": "<plane-api-key>", "X-Workspace-Slug": "<workspace-slug>" }',
        '  extraFields: { "entity_type": "issue_description", "entity_identifier": "<issue-id>" }',
        '',
        'Example — upload to any S3-compatible presigned URL:',
        '  destinationUrl: "<presigned-url>"',
        '  fieldName: "file"',
        '',
        'The destination must accept multipart/form-data POST requests.',
        'Returns the response body from the destination. Use responseJsonPath to extract a specific field (e.g. "id" or "data.asset_id").',
      ].join('\n')
    ),
    schema: z.object(transferIssueAttachmentSchema(t)),
    handler: async ({
      issueId,
      issueKey,
      attachmentId,
      destinationUrl,
      fieldName = 'file',
      headers = {},
      extraFields = {},
      responseJsonPath,
      requestMode = 'multipart',
    }) => {
      const resolved = resolveIdOrKey(
        'issue',
        { id: issueId, key: issueKey },
        t
      );
      if (!resolved.ok) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: resolved.error.message }],
        };
      }

      const fileData = await backlog.getIssueAttachment(
        resolved.value,
        attachmentId
      );

      const filename = tryDecodeFilename(
        'filename' in fileData ? (fileData.filename as string) : ''
      );
      const mimeType = getMimeType(filename);
      const fileBuffer = await streamToBuffer(fileData.body);

      let response: { statusCode: number; body: string };

      if (requestMode === 'json_rpc') {
        const { method, toolName, ...restFields } = extraFields as Record<
          string,
          string
        >;
        const rpcPayload = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: method ?? 'tools/call',
          params: {
            name: toolName,
            arguments: {
              ...restFields,
              file_name: filename,
              file_base64: fileBuffer.toString('base64'),
            },
          },
        });
        response = await postJson(
          destinationUrl,
          rpcPayload,
          headers as Record<string, string>
        );
      } else {
        const boundary = `----BacklogTransfer${Date.now()}`;
        const body = buildMultipartBody(
          filename,
          mimeType,
          fileBuffer,
          fieldName,
          extraFields,
          boundary
        );
        response = await postMultipart(
          destinationUrl,
          body,
          boundary,
          headers as Record<string, string>
        );
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Transfer failed: destination returned HTTP ${response.statusCode}.\n${response.body}`,
            },
          ],
        };
      }

      let extracted: unknown;
      if (responseJsonPath) {
        try {
          const parsed = JSON.parse(response.body);
          extracted = getNestedValue(parsed, responseJsonPath);
        } catch {
          // response not JSON — extracted stays undefined
        }
      }

      const output: Record<string, unknown> = {
        statusCode: response.statusCode,
        body: response.body,
      };
      if (extracted !== undefined) {
        output.extracted = extracted;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(output),
          },
        ],
      };
    },
  };
};
