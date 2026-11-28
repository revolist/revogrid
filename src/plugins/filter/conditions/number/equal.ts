import { LogicFunction, LogicFunctionExtraParam, LogicFunctionParam, ExtraField } from '../../filter.types';
import eq from '../equal';

/**
 * Number "=" filter. A number cell is compared by value, so "10.50", " 7"
 * and "1e3" match 10.5, 7 and 1000, the same way > and < read the input.
 * Other cells keep the text comparison of the string "Equal" filter.
 */
const eqN: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => {
  if (typeof value !== 'number' || extra === undefined || extra === null) {
    return eq(value, extra);
  }
  const input = extra.toString().trim();
  if (input.length === 0) {
    return true;
  }
  return value === parseFloat(input);
};

export const neqN: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => !eqN(value, extra);
neqN.extra = 'input' as ExtraField;
eqN.extra = 'input' as ExtraField;
export default eqN;
