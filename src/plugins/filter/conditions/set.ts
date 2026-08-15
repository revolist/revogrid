import { DEFAULT_BLANK_SEMANTICS, isBlankValue } from '../filter.blank';
import {
  FilterEvaluationContext,
  LogicFunction,
  LogicFunctionParam,
} from '../filter.types';

function blankContext(
  value: LogicFunctionParam,
  context?: FilterEvaluationContext,
): FilterEvaluationContext {
  return context ?? {
    model: {},
    property: '',
    sourceValue: value,
    parsedValue: value,
    hasOwnProperty: true,
    blankSemantics: DEFAULT_BLANK_SEMANTICS,
  };
}

export const notSet: LogicFunction = (value, _extra, context) =>
  isBlankValue(context ? context.sourceValue : value, blankContext(value, context));

const set: LogicFunction = (value, _extra, context) =>
  !notSet(value, _extra, context);
export default set;
