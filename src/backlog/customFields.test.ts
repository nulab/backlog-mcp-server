import {
  customFieldsToPayload,
  customFieldFiltersToPayload,
  type CustomFieldInput,
  type CustomFieldFilterInput,
} from './customFields.js';
import { describe, it, expect } from '@jest/globals';

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
    expect(customFieldFiltersToPayload(filters)).toEqual({
      customField_400: 1,
      'customField_401[]': [2, 3],
    });
  });
});
