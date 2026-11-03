/** Detect primitive or boxed BigInts, including values from another realm. */
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

/** Preserve nested BigInt values as decimal strings during JSON serialization. */
const bigIntReplacer = function (
  this: Record<string, unknown>,
  key: string,
  value: unknown,
): unknown {
  // JSON invokes toJSON before the replacer, so recover the original BigInt.
  const original = this[key];
  if (isBigInt(original)) {
    return BigInt.prototype.toString.call(original);
  }
  return isBigInt(value) ? BigInt.prototype.toString.call(value) : value;
};

/** Serialize a cell like JSON, preserving primitive and boxed BigInt precision. */
export function stringifyCellValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return isBigInt(value) ? BigInt.prototype.toString.call(value) : JSON.stringify(value, bigIntReplacer);
}
