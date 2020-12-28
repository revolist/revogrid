import {LogicFunction, LogicFunctionExtraParam, LogicFunctionParam} from '../../filter.types';
import eq from '../equal';
import lt from './lessThan';

const lsEq: LogicFunction = function(value: LogicFunctionParam, extra?: LogicFunctionExtraParam) {
    return eq(value, extra) || lt(value, extra);
};

lsEq.extra = 'input';
export default lsEq;

