import { Backlog } from 'backlog-js';
import {
  customFieldsToPayload,
  customFieldFiltersToPayload,
  type CustomFieldInput,
  type CustomFieldFilterInput,
} from './customFields.js';
import { describe, it, expect, afterEach, vi } from 'vitest';

describe('customFieldsToPayload', () => {
  it('returns an empty object when input is undefined', () => {
    const result = customFieldsToPayload(undefined);
    expect(result).toEqual({});
  });

  it('returns an empty object when input is null', () => {
    const result = customFieldsToPayload(null as any);
    expect(result).toEqual({});
  });

  it('converts single field with string value', () => {
    const input: CustomFieldInput[] = [{ id: 100, value: 'test value' }];
    const result = customFieldsToPayload(input);
    expect(result).toEqual({
      customField_100: 'test value',
    });
  });

  it('converts single field with number value', () => {
    const input: CustomFieldInput[] = [{ id: 101, value: 42 }];
    const result = customFieldsToPayload(input);
    expect(result).toEqual({
      customField_101: 42,
    });
  });

  it('converts single field with array value and otherValue', () => {
    const input: CustomFieldInput[] = [
      {
        id: 102,
        value: ['OptionA', 'OptionB'],
        otherValue: 'custom input',
      },
    ];
    const result = customFieldsToPayload(input);
    expect(result).toEqual({
      customField_102: ['OptionA', 'OptionB'],
      customField_102_otherValue: 'custom input',
    });
  });

  it('converts fields with numeric array values', () => {
    const input: CustomFieldInput[] = [
      {
        id: 150,
        value: [1, 2, 3],
      },
    ];
    const result = customFieldsToPayload(input);
    expect(result).toEqual({
      customField_150: [1, 2, 3],
    });
  });

  it('supports otherValue when value is undefined', () => {
    const input: CustomFieldInput[] = [
      {
        id: 160,
        otherValue: '自由入力',
      },
    ];
    const result = customFieldsToPayload(input);
    expect(result).toEqual({
      customField_160_otherValue: '自由入力',
    });
  });

  it('converts multiple fields of mixed types', () => {
    const input: CustomFieldInput[] = [
      { id: 201, value: 'text' },
      { id: 202, value: 123 },
      { id: 203, value: '', otherValue: 'detail' },
    ];
    const result = customFieldsToPayload(input);
    expect(result).toEqual({
      customField_201: 'text',
      customField_202: 123,
      customField_203: '',
      customField_203_otherValue: 'detail',
    });
  });
});

describe('customFieldFiltersToPayload', () => {
  it('returns empty object when input is undefined', () => {
    expect(customFieldFiltersToPayload(undefined)).toEqual({});
  });

  it('handles text filters', () => {
    const filters: CustomFieldFilterInput[] = [
      { id: 100, type: 'text', value: 'keyword' },
    ];
    expect(customFieldFiltersToPayload(filters)).toEqual({
      customField_100: 'keyword',
    });
  });

  it('handles numeric filters with min/max', () => {
    const filters: CustomFieldFilterInput[] = [
      { id: 200, type: 'numeric', min: 5, max: 10 },
    ];
    expect(customFieldFiltersToPayload(filters)).toEqual({
      customField_200_min: 5,
      customField_200_max: 10,
    });
  });

  it('handles date filters', () => {
    const filters: CustomFieldFilterInput[] = [
      {
        id: 300,
        type: 'date',
        min: '2024-01-01',
        max: '2024-12-31',
      },
    ];
    expect(customFieldFiltersToPayload(filters)).toEqual({
      customField_300_min: '2024-01-01',
      customField_300_max: '2024-12-31',
    });
  });

  it('handles list filters with single and multiple values', () => {
    const filters: CustomFieldFilterInput[] = [
      { id: 400, type: 'list', value: 1 },
      { id: 401, type: 'list', value: [2, 3] },
    ];
    // A single value is wrapped, not passed through: Backlog matches a list
    // custom field only on the indexed parameters an array produces.
    expect(customFieldFiltersToPayload(filters)).toEqual({
      customField_400: [1],
      customField_401: [2, 3],
    });
  });

  it('does not suffix list filter keys with []', () => {
    const filters: CustomFieldFilterInput[] = [
      { id: 400, type: 'list', value: 1 },
      { id: 401, type: 'list', value: [2, 3] },
    ];
    // `Request.toQueryString` appends the index itself for `customField_` keys,
    // so a `[]` suffix here produces `customField_401[][0]=…` on the wire.
    const payload = customFieldFiltersToPayload(filters);
    expect(payload).not.toHaveProperty('customField_400[]');
    expect(payload).not.toHaveProperty('customField_401[]');
  });
});

// The payload assertions above cannot catch this class of bug on their own: the
// suite was green while `customField_401[]` was being produced, because the
// breakage only appears once `Request.toQueryString` expands the array. Pin the
// actual request URL instead.
describe('list custom field filters on the wire', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const captureRequestUrl = async (
    params: Record<string, string | number | number[] | undefined>
  ): Promise<string> => {
    let requestUrl = '';
    vi.stubGlobal('fetch', async (input: string | URL | Request) => {
      requestUrl = input instanceof Request ? input.url : input.toString();
      return new Response('0', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const backlog = new Backlog({
      host: 'example.backlog.com',
      apiKey: 'dummy',
    });
    await backlog.getIssuesCount(params);
    return decodeURIComponent(requestUrl);
  };

  it('sends indexed parameters Backlog can match', async () => {
    const params = customFieldFiltersToPayload([
      { id: 401, type: 'list', value: [2, 3] },
    ]);

    const requestUrl = await captureRequestUrl(params);

    expect(requestUrl).toContain('customField_401[0]=2');
    expect(requestUrl).toContain('customField_401[1]=3');
    expect(requestUrl).not.toContain('customField_401[][0]');
  });

  it('sends an indexed parameter for a single value too', async () => {
    const params = customFieldFiltersToPayload([
      { id: 400, type: 'list', value: 1 },
    ]);

    const requestUrl = await captureRequestUrl(params);

    // `customField_400=1` is what a bare value produces, and Backlog does not
    // match it — it returns every issue rather than rejecting the request.
    expect(requestUrl).toContain('customField_400[0]=1');
    expect(requestUrl).not.toContain('customField_400=1');
  });
});
