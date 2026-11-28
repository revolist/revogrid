import { LogicFunction, LogicFunctionExtraParam, LogicFunctionParam } from '../../filter.types';
import eqN from './equal';
import lt from './lessThan';

const lsEq: LogicFunction = function (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) {
  return eqN(value, extra) || lt(value, extra);
};

lsEq.extra = 'input';
export default lsEq;
