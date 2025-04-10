import { LogicFunction, LogicFunctionExtraParam, LogicFunctionParam } from '../../filter.types';

const beginsWith: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => {
  if (!value) {
    return false;
  }
  if (!extra) {
    return true;
  }
  if (typeof value !== 'string') {
    value = JSON.stringify(value);
  }
  if (typeof extra !== 'string') {
    extra = JSON.stringify(extra);
  }
  return value.toLocaleLowerCase().indexOf(extra.toLocaleLowerCase()) === 0;
};

beginsWith.extra = 'input';
export default beginsWith;
