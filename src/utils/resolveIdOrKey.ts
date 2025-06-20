import { TranslationHelper } from '../createTranslationHelper.js';

export type EntityName = 'issue' | 'project' | 'repository';

type ResolveResult =
  | { ok: true; value: string | number }
  | { ok: false; error: Error };

type ResolveIdOrFieldInput<F extends string> = {
  id?: number;
} & {
  [K in F]?: string;
};

/**
 * Generic resolver for entity identification by ID or named field (e.g., key, name, slug).
 * @param entity - The entity name, e.g., "project"
 * @param fieldName - The name of the alternative to `id`, e.g., "key", "name", "slug"
 * @param values - An object with `id?: number` and `[fieldName]?: string`
 * @param t - Translator
 */
function resolveIdOrField<E extends EntityName, F extends string>(
  entity: E,
  fieldName: F,
  values: ResolveIdOrFieldInput<F>,
  t: TranslationHelper['t']
): ResolveResult {
  const value = tryResolveIdOrField(fieldName, values);
  if (value === undefined) {
    return {
      ok: false,
      error: new Error(
        t(
          `${entity.toUpperCase()}_ID_OR_${fieldName.toUpperCase()}_REQUIRED`,
          `${capitalize(entity)} ID or ${fieldName} is required`
        )
      ),
    };
  }

  return { ok: true, value };
}

function tryResolveIdOrField<F extends string>(
  fieldName: F,
  values: ResolveIdOrFieldInput<F>
): string | number | undefined {
  return values.id !== undefined ? values.id : values[fieldName];
}

export const resolveIdOrKey = <E extends EntityName>(
  entity: E,
  values: { id?: number; key?: string },
  t: TranslationHelper['t']
): ResolveResult => resolveIdOrField(entity, 'key', values, t);

export const resolveIdOrName = <E extends EntityName>(
  entity: E,
  values: { id?: number; name?: string },
  t: TranslationHelper['t']
): ResolveResult => resolveIdOrField(entity, 'name', values, t);

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
