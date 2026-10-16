import { getFilterValue } from './value';
import { LogicFunction, LogicFunctionExtraParam, LogicFunctionParam, ExtraField } from '../filter.types';

const eq: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => {
  if (typeof value === 'undefined' || (value === null && !extra)) {
    return true;
  }
  const text = getFilterValue(value);

  const filterVal = extra?.toString().toLocaleLowerCase();
  if (filterVal?.length === 0) {
    return true;
  }
  
  return text !== undefined && text.toLocaleLowerCase() === filterVal;
};

export const notEq: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => !eq(value, extra);
notEq.extra = 'input' as ExtraField;
eq.extra = 'input' as ExtraField;
export default eq;
