export type CustomFieldInput = {
  id: number;
  value?: string | number | string[] | number[];
  otherValue?: string;
};

export type CustomFieldFilterInput =
  | {
      id: number;
      type: 'text';
      value: string;
    }
  | {
      id: number;
      type: 'numeric';
      min?: number;
      max?: number;
    }
  | {
      id: number;
      type: 'date';
      min?: string;
      max?: string;
    }
  | {
      id: number;
      type: 'list';
      value: number | number[];
    };

/**
 * Converts Backlog-style customFields array into proper payload format
 */
export function customFieldsToPayload(
  customFields: CustomFieldInput[] | undefined
): Record<string, string | number | string[] | number[] | undefined> {
  if (customFields == null) {
    return {};
  }
  const result: Record<
    string,
    string | number | string[] | number[] | undefined
  > = {};

  for (const field of customFields) {
    if (field.value !== undefined) {
      result[`customField_${field.id}`] = field.value;
    }
    if (field.otherValue !== undefined) {
      result[`customField_${field.id}_otherValue`] = field.otherValue;
    }
  }

  return result;
}

export function customFieldFiltersToPayload(
  customFields: CustomFieldFilterInput[] | undefined
): Record<string, string | number | number[] | undefined> {
  if (!customFields || customFields.length === 0) {
    return {};
  }

  const result: Record<string, string | number | number[] | undefined> = {};

  for (const field of customFields) {
    const baseKey = `customField_${field.id}`;

    switch (field.type) {
      case 'text': {
        if (field.value.trim().length > 0) {
          result[baseKey] = field.value;
        }
        break;
      }
      case 'numeric': {
        if (field.min !== undefined) {
          result[`${baseKey}_min`] = field.min;
        }
        if (field.max !== undefined) {
          result[`${baseKey}_max`] = field.max;
        }
        break;
      }
      case 'date': {
        if (field.min) {
          result[`${baseKey}_min`] = field.min;
        }
        if (field.max) {
          result[`${baseKey}_max`] = field.max;
        }
        break;
      }
      case 'list': {
        if (Array.isArray(field.value)) {
          const values = field.value.filter((value) => Number.isFinite(value));
          if (values.length > 0) {
            result[`${baseKey}[]`] = values;
          }
        } else if (Number.isFinite(field.value)) {
          result[baseKey] = field.value;
        }
        break;
      }
      default: {
        const exhaustiveCheck: never = field;
        throw new Error(
          `Unsupported custom field filter type: ${exhaustiveCheck}`
        );
      }
    }
  }

  return result;
}
