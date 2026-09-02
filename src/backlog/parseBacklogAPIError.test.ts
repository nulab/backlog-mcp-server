import { describe, it, expect } from 'vitest';
import {
  parseBacklogAPIError,
  redactCredentialsInUrl,
} from './parseBacklogAPIError.js';

const SECRET = 'DUMMY_SECRET';
const BASE = 'https://example.backlog.com/api/v2/issues/P-1/attachments/7';

describe('redactCredentialsInUrl', () => {
  it('replaces the value of apiKey and keeps the rest of the URL', () => {
    expect(redactCredentialsInUrl(`${BASE}?apiKey=${SECRET}`)).toBe(
      `${BASE}?apiKey=REDACTED`
    );
  });

  it('keeps non-credential parameters untouched', () => {
    expect(
      redactCredentialsInUrl(`${BASE}?count=20&apiKey=${SECRET}&order=asc`)
    ).toBe(`${BASE}?count=20&apiKey=REDACTED&order=asc`);
  });

  it('matches credential parameter names case-insensitively', () => {
    expect(redactCredentialsInUrl(`${BASE}?APIKEY=${SECRET}`)).toBe(
      `${BASE}?APIKEY=REDACTED`
    );
  });

  it.each([
    'api_key',
    'access_token',
    'accessToken',
    'refresh_token',
    'token',
    'client_secret',
    'password',
  ])('redacts %s', (name) => {
    const result = redactCredentialsInUrl(`${BASE}?${name}=${SECRET}`);
    expect(result).toBe(`${BASE}?${name}=REDACTED`);
    expect(result).not.toContain(SECRET);
  });

  it('redacts every occurrence of a repeated credential parameter', () => {
    expect(
      redactCredentialsInUrl(`${BASE}?apiKey=${SECRET}&apiKey=${SECRET}2`)
    ).not.toContain(SECRET);
  });

  it('leaves a URL without query parameters unchanged', () => {
    expect(redactCredentialsInUrl(BASE)).toBe(BASE);
  });

  it('withholds a URL that cannot be parsed', () => {
    expect(
      redactCredentialsInUrl(`not a url?apiKey=${SECRET}`)
    ).toBeUndefined();
  });
});

describe('parseBacklogAPIError', () => {
  it('redacts the API key in the UnexpectedError message and url', () => {
    const result = parseBacklogAPIError({
      _name: 'UnexpectedError',
      _status: 500,
      _url: `${BASE}?apiKey=${SECRET}`,
    });

    expect(result.type).toBe('UnexpectedError');
    expect(result.status).toBe(500);
    expect(result.url).toBe(`${BASE}?apiKey=REDACTED`);
    expect(result.message).toBe(
      `Unexpected error (HTTP 500) while accessing ${BASE}?apiKey=REDACTED.`
    );
    expect(result.message).not.toContain(SECRET);
  });

  it('omits the URL from the UnexpectedError message when it cannot be parsed', () => {
    const result = parseBacklogAPIError({
      _name: 'UnexpectedError',
      _status: 500,
      _url: `garbage?apiKey=${SECRET}`,
    });

    expect(result.message).toBe('Unexpected error (HTTP 500).');
    expect(result.url).toBeUndefined();
  });

  it('redacts the API key in the url of a BacklogAuthError', () => {
    const result = parseBacklogAPIError({
      _name: 'BacklogAuthError',
      _status: 401,
      _url: `${BASE}?apiKey=${SECRET}`,
    });

    expect(result.type).toBe('BacklogAuthError');
    expect(result.url).toBe(`${BASE}?apiKey=REDACTED`);
    expect(result.message).toBe(
      'Authentication failed (HTTP 401). Please check your API key or permissions.'
    );
  });

  it('redacts the API key in the url of a BacklogApiError and reports code and message', () => {
    const result = parseBacklogAPIError({
      _name: 'BacklogApiError',
      _status: 400,
      _url: `${BASE}?apiKey=${SECRET}`,
      _body: { errors: [{ message: 'Invalid request', code: 7 }] },
    });

    expect(result).toEqual({
      type: 'BacklogApiError',
      message: 'Backlog API error (code: 7, status: 400)\nInvalid request',
      status: 400,
      code: 7,
      url: `${BASE}?apiKey=REDACTED`,
    });
  });

  it('falls back to UnknownError for a plain Error', () => {
    expect(parseBacklogAPIError(new Error('boom'))).toEqual({
      type: 'UnknownError',
      message: 'boom',
    });
  });

  it('falls back to UnknownError for a BacklogError shape missing a url', () => {
    expect(
      parseBacklogAPIError({ _name: 'UnexpectedError', _status: 500 })
    ).toEqual({
      type: 'UnknownError',
      message: 'An unknown error occurred.',
    });
  });
});
