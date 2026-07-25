import { describe, expect, it, vi } from 'vitest';

import {
  applyElementProperties,
  bindEventListeners,
  compactAfterEditDetail,
  createEventEnvelope,
  createSourceSyncToken,
  normalizeEventNames,
  toJsonSafe,
} from '../src/runtime.js';

describe('runtime', () => {
  it('serializes cyclic, function, class, non-finite, and DOM-like values', () => {
    const cyclic: Record<string, unknown> = {
      keep: 'value',
      fn: () => undefined,
      list: [undefined, Infinity],
      dom: { nodeType: 1, nodeName: 'DIV', secret: 'ignored' },
      instance: new (class Example {
        value = 1;
      })(),
    };
    Object.defineProperty(cyclic, 'throwing', {
      enumerable: true,
      get() {
        throw new Error('unreadable');
      },
    });
    cyclic.self = cyclic;

    expect(toJsonSafe(cyclic)).toEqual({
      dom: null,
      instance: null,
      keep: 'value',
      list: [null, null],
      self: null,
    });
  });

  it('uses a sequence so repeated identical events remain observable', () => {
    expect(createEventEnvelope('afterfocus', { row: 1 }, 1, 100)).toEqual({
      name: 'afterfocus',
      detail: { row: 1 },
      timestamp: 100,
      sequence: 1,
    });
    expect(createEventEnvelope('afterfocus', { row: 1 }, 2, 100).sequence).toBe(
      2,
    );
  });

  it('compacts cell and range edit details', () => {
    expect(
      compactAfterEditDetail({
        rowIndex: 3,
        colIndex: 2,
        prop: 'name',
        val: 'Ada',
        value: 'Old',
        type: 'rgRow',
        colType: 'rgCol',
        model: { name: 'Ada', huge: true },
        data: [{ name: 'Ada' }],
        column: { prop: 'name' },
      }),
    ).toEqual({
      colIndex: 2,
      colType: 'rgCol',
      prop: 'name',
      rowIndex: 3,
      type: 'rgRow',
      val: 'Ada',
      value: 'Old',
    });
    expect(
      compactAfterEditDetail({
        type: 'rgRow',
        data: { 3: { name: 'Ada' } },
        models: { 3: { name: 'Old', huge: true } },
        newRange: { x: 0, y: 3, x1: 0, y1: 3 },
        oldRange: null,
      }),
    ).toEqual({
      data: { 3: { name: 'Ada' } },
      newRange: { x: 0, x1: 0, y: 3, y1: 3 },
      oldRange: null,
      type: 'rgRow',
    });
  });

  it('diffs property assignment and suppresses a synchronized source echo', () => {
    const element: Record<string, unknown> = {};
    const previous: Record<string, unknown> = {};
    const source = [{ id: 1 }];
    applyElementProperties(
      element,
      ['source', 'readonly'],
      { source, readonly: false },
      previous,
    );
    expect(element).toEqual({ source, readonly: false });

    const emittedSource = [{ id: 1, name: 'Ada' }];
    const token = createSourceSyncToken(emittedSource);
    const echo = JSON.parse(JSON.stringify(emittedSource));
    const result = applyElementProperties(
      element,
      ['source', 'readonly'],
      { source: echo, readonly: false },
      previous,
      token,
    );
    expect(result.sourceSyncConsumed).toBe(true);
    expect(element.source).toBe(source);
    expect(previous.source).toBe(echo);
  });

  it('does not clone source during ordinary property diffing', () => {
    const source = Array.from({ length: 10_000 }, (_, id) => ({ id }));
    const element: Record<string, unknown> = {};
    applyElementProperties(element, ['source'], { source }, {});
    expect(element.source).toBe(source);
  });

  it('normalizes generic listeners and cleans up every bound listener', () => {
    expect(normalizeEventNames(['z', 'a', 'z', '', 1])).toEqual(['a', 'z']);
    const target = new EventTarget();
    const first = vi.fn();
    const second = vi.fn();
    const cleanup = bindEventListeners(target, {
      first: first as EventListener,
      second: second as EventListener,
    });
    target.dispatchEvent(new Event('first'));
    cleanup();
    target.dispatchEvent(new Event('first'));
    target.dispatchEvent(new Event('second'));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
