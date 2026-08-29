import { describe, expect, it } from 'vitest';
import { parseBacklogAPIError } from './parseBacklogAPIError.js';

const API_KEY = 'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk';

function backlogError(
  name: string,
  status: number,
  url: string,
  body?: unknown
) {
  return { _name: name, _status: status, _url: url, _body: body };
}

describe('parseBacklogAPIError', () => {
  // `backlog-js` authenticates an API key by putting it in the query string, so
  // every error it raises in API-key mode carries the key in `_url`. Tool output
  // reaches the model and the client's transcript.
  it.each(['BacklogAuthError', 'BacklogApiError', 'UnexpectedError'])(
    'redacts the API key from a %s',
    (name) => {
      const parsed = parseBacklogAPIError(
        backlogError(
          name,
          name === 'BacklogAuthError' ? 401 : 500,
          `https://example.backlog.com/api/v2/issues/PROJ-1?apiKey=${API_KEY}`,
          { errors: [{ message: 'nope', code: 7 }] }
        )
      );

      expect(parsed.message).not.toContain(API_KEY);
      expect(parsed.url).not.toContain(API_KEY);
      expect(parsed.url).toContain('apiKey=%5BREDACTED%5D');
    }
  );

  it('names the failing endpoint in an UnexpectedError, minus the credential', () => {
    const parsed = parseBacklogAPIError(
      backlogError(
        'UnexpectedError',
        502,
        `https://example.backlog.com/api/v2/issues/PROJ-1/attachments/7?apiKey=${API_KEY}`
      )
    );

    expect(parsed.message).toContain('/api/v2/issues/PROJ-1/attachments/7');
    expect(parsed.message).not.toContain(API_KEY);
  });

  it('leaves a URL without credentials untouched', () => {
    const url =
      'https://example.backlog.com/api/v2/issues/count?customField_401[0]=2';
    const parsed = parseBacklogAPIError(
      backlogError('UnexpectedError', 500, url)
    );

    expect(parsed.url).toBe(url);
  });

  it('withholds a URL it cannot parse rather than passing it through', () => {
    const parsed = parseBacklogAPIError(
      backlogError('UnexpectedError', 500, `not a url?apiKey=${API_KEY}`)
    );

    expect(parsed.url).toBe('[unparseable URL redacted]');
    expect(parsed.message).not.toContain(API_KEY);
  });

  it('reports a non-Backlog error by its message', () => {
    expect(parseBacklogAPIError(new Error('boom'))).toEqual({
      type: 'UnknownError',
      message: 'boom',
    });
  });
});
