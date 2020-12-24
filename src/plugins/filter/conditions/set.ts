import {LogicFunction, LogicFunctionParam} from '../filter.types';

const set: LogicFunction = (value: LogicFunctionParam) => !(value === '' || value === null || value === void 0);
export const notSet: LogicFunction = (value: LogicFunctionParam) => !set(value);
export default set;
