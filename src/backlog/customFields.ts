export type CustomFieldInput = {
  id: number;
  value: string | number | string[];
  otherValue?: string;
};

/**
 * Converts Backlog-style customFields array into proper payload format
 */
export function customFieldsToPayload(
  customFields: CustomFieldInput[] | undefined
): Record<string, string | number | string[] | undefined> {
  if (customFields == null) {
    return {};
  }
  const result: Record<string, string | number | string[] | undefined> = {};

  for (const field of customFields) {
    result[`customField_${field.id}`] = field.value;
    if (field.otherValue) {
      result[`customField_${field.id}_otherValue`] = field.otherValue;
    }
  }

  return result;
}
