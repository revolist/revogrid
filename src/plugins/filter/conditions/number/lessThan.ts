import { LogicFunction, LogicFunctionExtraParam, LogicFunctionParam } from '../../filter.types';

const lt: LogicFunction = function (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) {
  let conditionValue: number;
  if (typeof value === 'number') {
    conditionValue = parseFloat(extra?.toString());
    return value < conditionValue;
  } else {
    return false;
  }
};

lt.extra = 'input';
export default lt;
