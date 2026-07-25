export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface DashEventEnvelope {
  name: string;
  detail: JsonValue;
  timestamp: number;
  sequence: number;
}

export interface SourceSyncToken {
  value: JsonValue;
  serialized: string;
}

export interface ApplyElementPropertiesResult {
  sourceSyncConsumed: boolean;
}

const OMIT = Symbol('dash-json-omit');

function isDomValue(value: object): boolean {
  const maybeNode = value as {
    nodeType?: unknown;
    nodeName?: unknown;
  };
  if (
    typeof maybeNode.nodeType === 'number' &&
    typeof maybeNode.nodeName === 'string'
  ) {
    return true;
  }
  return typeof Node !== 'undefined' && value instanceof Node;
}

function serializeValue(
  value: unknown,
  stack: WeakSet<object>,
  arrayEntry: boolean,
): JsonValue | typeof OMIT {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (
    typeof value === 'undefined' ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {
    return arrayEntry ? null : OMIT;
  }
  if (typeof value !== 'object') {
    return arrayEntry ? null : OMIT;
  }
  if (isDomValue(value) || stack.has(value)) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  stack.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map(item => {
        const serialized = serializeValue(item, stack, true);
        return serialized === OMIT ? null : serialized;
      });
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return null;
    }
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      try {
        const serialized = serializeValue(
          (value as Record<string, unknown>)[key],
          stack,
          false,
        );
        if (serialized !== OMIT) {
          result[key] = serialized;
        }
      } catch {
        // Getters and proxies can throw. Omit those values at the Dash boundary.
      }
    }
    return result;
  } finally {
    stack.delete(value);
  }
}

/**
 * Converts a value into data accepted by Dash's JSON transport.
 *
 * Unsupported object fields are omitted. Unsupported array entries, cyclic
 * references, DOM nodes, and class instances become `null`.
 */
export function toJsonSafe(value: unknown): JsonValue {
  const serialized = serializeValue(value, new WeakSet(), true);
  return serialized === OMIT ? null : serialized;
}

export function createEventEnvelope(
  name: string,
  detail: unknown,
  sequence: number,
  timestamp = Date.now(),
): DashEventEnvelope {
  return {
    name,
    detail: toJsonSafe(detail),
    timestamp,
    sequence,
  };
}

/**
 * Removes the full row model and grid-owned collections from an `afteredit`
 * event while preserving the edit delta required by a Dash callback.
 */
export function compactAfterEditDetail(detail: unknown): JsonValue {
  if (!detail || typeof detail !== 'object') {
    return toJsonSafe(detail);
  }
  const value = detail as Record<string, unknown>;
  if (value.data && typeof value.data === 'object' && 'models' in value) {
    return toJsonSafe({
      type: value.type,
      data: value.data,
      newRange: value.newRange,
      oldRange: value.oldRange,
    });
  }
  const compact: Record<string, unknown> = {};
  for (const key of [
    'rowIndex',
    'colIndex',
    'prop',
    'val',
    'value',
    'type',
    'colType',
  ]) {
    if (key in value) {
      compact[key] = value[key];
    }
  }
  return toJsonSafe(compact);
}

export function createSourceSyncToken(value: unknown): SourceSyncToken {
  const safeValue = toJsonSafe(value);
  return {
    value: safeValue,
    serialized: JSON.stringify(safeValue),
  };
}

export function isSourceSyncEcho(
  value: unknown,
  token: SourceSyncToken | null,
): boolean {
  if (!token) {
    return false;
  }
  if (Object.is(value, token.value)) {
    return true;
  }
  return JSON.stringify(toJsonSafe(value)) === token.serialized;
}

/**
 * Assigns changed props directly to a custom element. `previousProps` is
 * mutated intentionally so callers can retain it in a React ref.
 */
export function applyElementProperties(
  element: Record<string, unknown>,
  propertyNames: readonly string[],
  nextProps: Record<string, unknown>,
  previousProps: Record<string, unknown>,
  pendingSourceSync: SourceSyncToken | null = null,
): ApplyElementPropertiesResult {
  let sourceSyncConsumed = false;
  for (const propertyName of propertyNames) {
    const nextValue = nextProps[propertyName];
    if (Object.is(previousProps[propertyName], nextValue)) {
      continue;
    }
    if (
      propertyName === 'source' &&
      isSourceSyncEcho(nextValue, pendingSourceSync)
    ) {
      previousProps[propertyName] = nextValue;
      sourceSyncConsumed = true;
      continue;
    }
    element[propertyName] = nextValue;
    previousProps[propertyName] = nextValue;
  }
  return { sourceSyncConsumed };
}

export function normalizeEventNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter(item => typeof item === 'string' && item))]
    .sort();
}

export function bindEventListeners(
  element: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  listeners: Readonly<Record<string, EventListener>>,
): () => void {
  const entries = Object.entries(listeners);
  for (const [name, listener] of entries) {
    element.addEventListener(name, listener);
  }
  return () => {
    for (const [name, listener] of entries) {
      element.removeEventListener(name, listener);
    }
  };
}
