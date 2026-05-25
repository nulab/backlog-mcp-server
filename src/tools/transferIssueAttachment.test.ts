import { transferIssueAttachmentTool } from './transferIssueAttachment.js';
import { Buffer } from 'node:buffer';
import { vi, describe, it, expect, afterEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import { PassThrough } from 'stream';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

function createMockStream(content: Buffer | string): PassThrough {
  const stream = new PassThrough();
  stream.end(content);
  return stream;
}

function startTestServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe('transferIssueAttachmentTool', () => {
  const t = createTranslationHelper();
  let server: http.Server;
  let serverUrl: string;

  afterEach(async () => {
    if (server) await stopServer(server);
  });

  it('POSTs the attachment as multipart/form-data and returns the response body', async () => {
    const imageData = Buffer.from('fake-png-bytes');
    let receivedContentType = '';
    let receivedBody = Buffer.alloc(0);

    ({ server, url: serverUrl } = await startTestServer((req, res) => {
      receivedContentType = req.headers['content-type'] ?? '';
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        receivedBody = Buffer.concat(chunks);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'asset-123' }));
      });
    }));

    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot.png',
        url: 'https://example.backlog.com/file/screenshot.png',
        body: createMockStream(imageData),
      }),
    };

    const tool = transferIssueAttachmentTool(mockBacklog as Backlog, t);
    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      destinationUrl: serverUrl,
    });

    expect(result.isError).not.toBe(true);
    expect(receivedContentType).toMatch(/multipart\/form-data/);
    expect(receivedBody.toString()).toContain('screenshot.png');
    expect(receivedBody.toString()).toContain('fake-png-bytes');

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'text');
    if (result.content[0].type === 'text') {
      expect(result.content[0].text).toContain('asset-123');
    }
  });

  it('uses custom fieldName when specified', async () => {
    let receivedBody = '';

    ({ server, url: serverUrl } = await startTestServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        receivedBody = Buffer.concat(chunks).toString();
        res.writeHead(200);
        res.end('ok');
      });
    }));

    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'photo.png',
        url: 'https://example.backlog.com/file/photo.png',
        body: createMockStream('data'),
      }),
    };

    const tool = transferIssueAttachmentTool(mockBacklog as Backlog, t);
    await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      destinationUrl: serverUrl,
      fieldName: 'asset_key',
    });

    expect(receivedBody).toContain('name="asset_key"');
  });

  it('sends custom headers to the destination', async () => {
    let receivedHeaders: http.IncomingHttpHeaders = {};

    ({ server, url: serverUrl } = await startTestServer((req, res) => {
      receivedHeaders = req.headers;
      req.resume();
      res.writeHead(200);
      res.end('ok');
    }));

    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'file.png',
        url: 'https://example.backlog.com/file/file.png',
        body: createMockStream('data'),
      }),
    };

    const tool = transferIssueAttachmentTool(mockBacklog as Backlog, t);
    await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      destinationUrl: serverUrl,
      headers: { 'X-API-Key': 'secret-token' },
    });

    expect(receivedHeaders['x-api-key']).toBe('secret-token');
  });

  it('includes extraFields in the multipart body', async () => {
    let receivedBody = '';

    ({ server, url: serverUrl } = await startTestServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        receivedBody = Buffer.concat(chunks).toString();
        res.writeHead(200);
        res.end('ok');
      });
    }));

    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'file.png',
        url: 'https://example.backlog.com/file/file.png',
        body: createMockStream('data'),
      }),
    };

    const tool = transferIssueAttachmentTool(mockBacklog as Backlog, t);
    await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      destinationUrl: serverUrl,
      extraFields: { project_id: 'proj-abc', type: 'image' },
    });

    expect(receivedBody).toContain('name="project_id"');
    expect(receivedBody).toContain('proj-abc');
    expect(receivedBody).toContain('name="type"');
    expect(receivedBody).toContain('image');
  });

  it('extracts a nested field from JSON response when responseJsonPath is set', async () => {
    ({ server, url: serverUrl } = await startTestServer((req, res) => {
      req.resume();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: { asset_id: 'xyz-789' } }));
    }));

    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'file.png',
        url: 'https://example.backlog.com/file/file.png',
        body: createMockStream('data'),
      }),
    };

    const tool = transferIssueAttachmentTool(mockBacklog as Backlog, t);
    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      destinationUrl: serverUrl,
      responseJsonPath: 'data.asset_id',
    });

    expect(result.isError).not.toBe(true);
    if (result.content[0].type === 'text') {
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.extracted).toBe('xyz-789');
    }
  });

  it('returns error when destination returns non-2xx status', async () => {
    ({ server, url: serverUrl } = await startTestServer((req, res) => {
      req.resume();
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
    }));

    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'file.png',
        url: 'https://example.backlog.com/file/file.png',
        body: createMockStream('data'),
      }),
    };

    const tool = transferIssueAttachmentTool(mockBacklog as Backlog, t);
    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      destinationUrl: serverUrl,
    });

    expect(result.isError).toBe(true);
    if (result.content[0].type === 'text') {
      expect(result.content[0].text).toContain('403');
    }
  });

  it('sends JSON-RPC payload with base64 file when requestMode is json_rpc', async () => {
    const fileData = Buffer.from('png-bytes');
    let receivedBody: Record<string, unknown> = {};
    let receivedContentType = '';

    ({ server, url: serverUrl } = await startTestServer((req, res) => {
      receivedContentType = req.headers['content-type'] ?? '';
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        receivedBody = JSON.parse(Buffer.concat(chunks).toString());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: { content: [{ type: 'text', text: 'asset-rpc-999' }] },
          })
        );
      });
    }));

    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        filename: 'screenshot.png',
        url: 'https://example.backlog.com/file/screenshot.png',
        body: createMockStream(fileData),
      }),
    };

    const tool = transferIssueAttachmentTool(mockBacklog as Backlog, t);
    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 100,
      destinationUrl: serverUrl,
      requestMode: 'json_rpc',
      extraFields: {
        method: 'tools/call',
        toolName: 'upload_inline_image',
        project_id: 'proj-plane-123',
      },
      responseJsonPath: 'result.content.0.text',
    });

    expect(receivedContentType).toMatch(/application\/json/);
    expect(receivedBody.jsonrpc).toBe('2.0');
    expect(receivedBody.method).toBe('tools/call');

    const params = receivedBody.params as Record<string, unknown>;
    const args = params.arguments as Record<string, unknown>;
    expect(args.project_id).toBe('proj-plane-123');
    expect(args.file_name).toBe('screenshot.png');
    expect(args.file_base64).toBe(fileData.toString('base64'));

    expect(result.isError).not.toBe(true);
    if (result.content[0].type === 'text') {
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.extracted).toBe('asset-rpc-999');
    }
  });

  it('returns error if neither issueId nor issueKey is provided', async () => {
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn(),
    };

    const tool = transferIssueAttachmentTool(mockBacklog as Backlog, t);
    const result = await tool.handler({
      attachmentId: 100,
      destinationUrl: 'http://example.com/upload',
    });

    expect(result.isError).toBe(true);
  });
});
