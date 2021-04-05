import { LogicFunction, LogicFunctionExtraParam, LogicFunctionParam } from '../../filter.types';

const contains: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => {
  if (!value) {
    return false;
  }
  if (extra) {
    if (typeof value !== 'string') {
      value = JSON.stringify(value);
    }
    return value.toLocaleLowerCase().indexOf(extra.toString().toLowerCase()) > -1;
  }
  return true;
};

export const notContains: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => {
  return !contains(value, extra);
};
notContains.extra = 'input';
contains.extra = 'input';
export default contains;
