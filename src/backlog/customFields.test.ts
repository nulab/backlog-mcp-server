import {
  customFieldsToPayload,
  type CustomFieldInput,
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
