import { LogicFunction, LogicFunctionExtraParam, LogicFunctionParam } from '../../filter.types';

const gtThan: LogicFunction = function (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) {
  let conditionValue: number;

  if (typeof value === 'number' && typeof extra !== 'undefined' && extra !== null) {
    conditionValue = parseFloat(extra?.toString());
    return value > conditionValue;
  }
  return false;
};

gtThan.extra = 'input';
export default gtThan;
