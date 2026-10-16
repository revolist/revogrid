import { stringifyCellValue } from '../../../utils/serialization';

/** Values that cannot be serialized (for example cycles) do not match text filters. */
export function getFilterValue(value: unknown): string | undefined {
  try {
    return stringifyCellValue(value);
  } catch {
    return undefined;
  }
}
