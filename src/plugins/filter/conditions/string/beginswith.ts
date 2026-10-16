import { getFilterValue } from '../value';
import { LogicFunction, LogicFunctionExtraParam, LogicFunctionParam } from '../../filter.types';

const beginsWith: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => {
  if (!value) {
    return false;
  }
  if (!extra) {
    return true;
  }
  const text = getFilterValue(value);
  const filterText = getFilterValue(extra);
  return text !== undefined && filterText !== undefined &&
    text.toLocaleLowerCase().indexOf(filterText.toLocaleLowerCase()) === 0;
};

beginsWith.extra = 'input';
export default beginsWith;
