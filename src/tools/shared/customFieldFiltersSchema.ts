import { z, ZodIssueCode } from 'zod';
import { TranslationHelper } from '../../createTranslationHelper.js';

export const buildCustomFieldFilterSchema = (
  t: TranslationHelper['t']
) => {
  const schema = z.discriminatedUnion('type', [
    z
      .object({
        type: z.literal('text'),
        id: z
          .number()
          .describe(
            t('TOOL_CUSTOM_FIELD_FILTER_ID', 'Custom field ID (e.g., 12345)')
          ),
        value: z
          .string()
          .min(1)
          .describe(
            t(
              'TOOL_CUSTOM_FIELD_FILTER_TEXT_VALUE',
              'Keyword to match for the custom field'
            )
          ),
      })
      .describe(t('TOOL_CUSTOM_FIELD_FILTER_TEXT', 'Text custom field filter')),
    z
      .object({
        type: z.literal('numeric'),
        id: z
          .number()
          .describe(
            t('TOOL_CUSTOM_FIELD_FILTER_ID', 'Custom field ID (e.g., 12345)')
          ),
        min: z
          .number()
          .optional()
          .describe(
            t(
              'TOOL_CUSTOM_FIELD_FILTER_NUMERIC_MIN',
              'Minimum numeric value (inclusive)'
            )
          ),
        max: z
          .number()
          .optional()
          .describe(
            t(
              'TOOL_CUSTOM_FIELD_FILTER_NUMERIC_MAX',
              'Maximum numeric value (inclusive)'
            )
          ),
      })
      .describe(
        t('TOOL_CUSTOM_FIELD_FILTER_NUMERIC', 'Numeric custom field filter')
      ),
    z
      .object({
        type: z.literal('date'),
        id: z
          .number()
          .describe(
            t('TOOL_CUSTOM_FIELD_FILTER_ID', 'Custom field ID (e.g., 12345)')
          ),
        min: z
          .string()
          .optional()
          .describe(
            t(
              'TOOL_CUSTOM_FIELD_FILTER_DATE_MIN',
              'Start date (yyyy-MM-dd)'
            )
          ),
        max: z
          .string()
          .optional()
          .describe(
            t(
              'TOOL_CUSTOM_FIELD_FILTER_DATE_MAX',
              'End date (yyyy-MM-dd)'
            )
          ),
      })
      .describe(t('TOOL_CUSTOM_FIELD_FILTER_DATE', 'Date custom field filter')),
    z
      .object({
        type: z.literal('list'),
        id: z
          .number()
          .describe(
            t('TOOL_CUSTOM_FIELD_FILTER_ID', 'Custom field ID (e.g., 12345)')
          ),
        value: z
          .union([z.number(), z.array(z.number()).min(1)])
          .describe(
            t(
              'TOOL_CUSTOM_FIELD_FILTER_LIST_VALUE',
              'Value ID(s) to match for list-type custom field'
            )
          ),
      })
      .describe(t('TOOL_CUSTOM_FIELD_FILTER_LIST', 'List custom field filter')),
  ]);

  return schema.superRefine((data, ctx) => {
    if (data.type === 'numeric' && data.min === undefined && data.max === undefined) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: t(
          'TOOL_CUSTOM_FIELD_FILTER_NUMERIC_REQUIRED',
          'Provide at least one of min or max for numeric filters'
        ),
        path: ['min'],
      });
    }

    if (data.type === 'date' && !data.min && !data.max) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: t(
          'TOOL_CUSTOM_FIELD_FILTER_DATE_REQUIRED',
          'Provide at least one of min or max for date filters'
        ),
        path: ['min'],
      });
    }
  });
};

export type CustomFieldFilterSchema = ReturnType<typeof buildCustomFieldFilterSchema>;