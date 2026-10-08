const isBigInt = (value: unknown): value is bigint | BigInt => {
  if (typeof value === 'bigint') {
    return true;
  }
  if (typeof BigInt !== 'function' || typeof value !== 'object' || value === null) {
    return false;
  }
  try {
    // Check the internal BigInt value rather than a spoofable type tag.
    BigInt.prototype.valueOf.call(value);
    return true;
  } catch {
    return false;
  }
};

const bigIntReplacer = (_key: string, value: unknown): unknown =>
  isBigInt(value) ? value.toString() : value;

/** Serialize a cell like JSON, preserving primitive and boxed BigInt precision. */
export function stringifyCellValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return isBigInt(value) ? value.toString() : JSON.stringify(value, bigIntReplacer);
}
