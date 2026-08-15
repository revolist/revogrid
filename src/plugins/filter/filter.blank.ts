import type {
  BlankSemantics,
  FilterEvaluationContext,
} from './filter.types';

export const DEFAULT_BLANK_SEMANTICS: Readonly<BlankSemantics> = Object.freeze({
  null: true,
  undefined: true,
  emptyString: true,
  whitespaceOnlyString: false,
  emptyArray: false,
  missingProperty: true,
});

const BOOLEAN_FIELDS: (keyof Omit<BlankSemantics, 'isBlank'>)[] = [
  'null',
  'undefined',
  'emptyString',
  'whitespaceOnlyString',
  'emptyArray',
  'missingProperty',
];

/** Merge a grid policy and a partial column policy over Core defaults. */
export function resolveBlankSemantics(
  gridPolicy?: BlankSemantics,
  columnPolicy?: BlankSemantics,
): BlankSemantics {
  const resolved: BlankSemantics = { ...DEFAULT_BLANK_SEMANTICS };

  for (const policy of [gridPolicy, columnPolicy]) {
    if (!policy) {
      continue;
    }
    for (const field of BOOLEAN_FIELDS) {
      if (policy[field] !== undefined) {
        resolved[field] = policy[field];
      }
    }
    if (policy.isBlank !== undefined) {
      resolved.isBlank = policy.isBlank;
    }
  }

  return resolved;
}

/** Evaluate blankness from the unparsed source value and property presence. */
export function isBlankValue(
  value: any,
  context: FilterEvaluationContext,
): boolean {
  const policy = context.blankSemantics;
  let fallbackResult: boolean;

  if (!context.hasOwnProperty) {
    fallbackResult = policy.missingProperty === true;
  } else if (value === null) {
    fallbackResult = policy.null === true;
  } else if (value === undefined) {
    fallbackResult = policy.undefined === true;
  } else if (value === '') {
    fallbackResult = policy.emptyString === true;
  } else if (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === ''
  ) {
    fallbackResult = policy.whitespaceOnlyString === true;
  } else if (Array.isArray(value) && value.length === 0) {
    fallbackResult = policy.emptyArray === true;
  } else {
    fallbackResult = false;
  }

  return policy.isBlank
    ? policy.isBlank(value, context, fallbackResult)
    : fallbackResult;
}
