import { LogicFunction, LogicFunctionExtraParam, LogicFunctionParam } from '../../filter.types';
import eq from '../equal';
import gt from './greaterThan';

const gtThanEq: LogicFunction = function (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) {
  return eq(value, extra) || gt(value, extra);
};

gtThanEq.extra = 'input';
export default gtThanEq;
