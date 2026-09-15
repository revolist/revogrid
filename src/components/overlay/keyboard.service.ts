import { getRange } from '@store';
import {
  codesLetter,
  isAll,
  isClear,
  isCopy,
  isCut,
  isEnterKeyValue,
  isPaste,
  isShortcutModifier,
  isTab,
  timeout,
  RESIZE_INTERVAL,
  type Observable,
} from '../../utils';
import {
  EventData,
  getCoordinate,
  isAfterLast,
  isBeforeFirst,
} from './selection.utils';
import { Cell, Nullable, RangeArea, SelectionStoreState } from '@type';
import { isEditInput } from '../editors/edit.utils';

type Config = {
  selectionStore: Observable<SelectionStoreState>;

  // Apply changes from edit.
  change(val?: any): boolean;
  // Cancels edit. Escape changes.
  cancel(): void;

  clearCell(): void;
  focus(
    focus: Cell,
    changes: Partial<Cell>,
    focusNextViewport?: number,
  ): boolean;

  getData(): any;
  internalPaste(): void;
  range(range: RangeArea | null): boolean;
  selectAll(): void;
};

const ARROW_CODES: string[] = [
  codesLetter.ARROW_UP,
  codesLetter.ARROW_DOWN,
  codesLetter.ARROW_LEFT,
  codesLetter.ARROW_RIGHT,
];
const DIRECTION_CODES = new Set<string>([codesLetter.TAB, ...ARROW_CODES]);
type DirectionKeyChange = {
  changes: Partial<Cell>;
  isMulti?: boolean;
  edge?: boolean;
};
export class KeyboardService {
  /** Keep focus transitions in keydown order so rendering can scroll each cell into view. */
  private keyChangeQueue: Promise<boolean> = Promise.resolve(false);
  private keyChangeGeneration = 0;
  private applyingKeyChange = false;

  constructor(private readonly sv: Config) {}

  /** Cancel delayed directional input after focus or edit context changes externally. */
  invalidatePendingChanges() {
    if (!this.applyingKeyChange) {
      this.keyChangeGeneration += 1;
    }
  }

  /**
   * Appends printable key input that arrives after edit mode was requested
   * but before the editor input has mounted or received focus.
   */
  private appendPendingEditValue(e: KeyboardEvent): boolean {
    if (
      isShortcutModifier(e) ||
      e.key.length !== 1 ||
      (e.target instanceof HTMLElement && isEditInput(e.target))
    ) {
      return false;
    }

    const editCell = this.sv.selectionStore.get('edit');
    if (typeof editCell?.val !== 'string') {
      return false;
    }

    e.preventDefault();
    this.sv.selectionStore.set('edit', {
      ...editCell,
      val: `${editCell.val}${e.key}`,
    });
    return true;
  }

  async keyDown(
    e: KeyboardEvent,
    canRange: boolean,
    isEditMode: boolean,
    { range, focus }: Nullable<Pick<EventData, 'range' | 'focus'>>,
  ) {
    // IF EDIT MODE
    if (isEditMode) {
      if (this.appendPendingEditValue(e)) {
        return;
      }

      switch (e.code) {
        case codesLetter.ESCAPE:
          this.sv.cancel();
          break;
        case codesLetter.TAB:
          this.keyChangeSelection(e, canRange);
          break;
      }
      return;
    }

    // IF NOT EDIT MODE

    // pressed clear key
    if (range && isClear(e.code)) {
      this.sv.clearCell();
      return;
    }

    // below works with focus only
    if (!focus) {
      return;
    }

    // tab key means same as arrow right
    if (isTab(e.code)) {
      this.keyChangeSelection(e, canRange);
      return;
    }

    // pressed enter
    if (isEnterKeyValue(e.key)) {
      this.sv.change();
      return;
    }

    // copy operation
    if (isCopy(e)) {
      return;
    }

    // cut operation
    if (isCut(e)) {
      return;
    }

    // paste operation
    if (isPaste(e)) {
      this.sv.internalPaste();
      return;
    }

    // select all
    if (isAll(e)) {
      if (canRange) {
        this.selectAll(e);
      }
      return;
    }

    // pressed letter key
    if (!isShortcutModifier(e) && e.key.length === 1) {
      if (this.sv.change(e.key)) {
        e.preventDefault();
      }
      return;
    }

    // pressed arrow, change selection position
    if (await this.keyChangeSelection(e, canRange)) {
      return;
    }
  }

  private selectAll(e: KeyboardEvent) {
    const range = this.sv.selectionStore.get('range');
    const focus = this.sv.selectionStore.get('focus');
    // if no range or focus - do nothing
    if (!range || !focus) {
      return;
    }
    e.preventDefault();
    this.sv.selectAll();
  }

  async keyChangeSelection(e: KeyboardEvent, canRange: boolean) {
    const data = this.changeDirectionKey(e, canRange);
    if (!data) {
      return false;
    }
    const keyChangeGeneration = this.keyChangeGeneration;

    // this interval needed for several cases
    // grid could be resized before next click
    // at this case to avoid screen jump we use this interval
    await timeout(RESIZE_INTERVAL + 30);

    const applyKeyChange = async () => {
      if (keyChangeGeneration !== this.keyChangeGeneration) {
        return false;
      }
      const range = this.sv.selectionStore.get('range');
      const focus = this.sv.selectionStore.get('focus');
      this.applyingKeyChange = true;
      let changed: boolean;
      try {
        changed = data.edge
          ? this.keyEdgeChange(data.changes, range, focus, !!data.isMulti)
          : this.keyPositionChange(data.changes, range, focus, data.isMulti);
      } finally {
        this.applyingKeyChange = false;
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      }));
      return changed;
    };
    const queuedChange = this.keyChangeQueue.then(applyKeyChange, applyKeyChange);
    this.keyChangeQueue = queuedChange.catch(() => false);
    return queuedChange;
  }

  keyPositionChange(
    changes: Partial<Cell>,
    range: RangeArea | null,
    focus: Cell | null,
    isMulti = false,
  ) {
    if (!range || !focus) {
      return false;
    }
    const data = getCoordinate(range, focus, changes, isMulti);
    if (!data) {
      return false;
    }
    const eData: EventData = this.sv.getData();
    if (isMulti) {
      const isOutOfBounds = [data.start, data.end].some(
        cell => isAfterLast(cell, eData.lastCell) || isBeforeFirst(cell),
      );
      if (isOutOfBounds) {
        return false;
      }
      const range = getRange(data.start, data.end);
      return this.sv.range(range);
    }
    return this.sv.focus(
      data.start,
      changes,
      isAfterLast(data.start, eData.lastCell)
        ? 1
        : isBeforeFirst(data.start)
          ? -1
          : 0,
    );
  }

  private keyEdgeChange(
    changes: Partial<Cell>,
    range: RangeArea | null,
    focus: Cell | null,
    isMulti: boolean,
  ) {
    if (!range || !focus) {
      return false;
    }
    const { lastCell } = this.sv.getData();
    const coordinate = changes.x ? 'x' : 'y';
    const direction = changes[coordinate]!;
    const target = direction > 0 ? lastCell[coordinate] - 1 : 0;

    if (isMulti) {
      const edgeCoordinate = coordinate === 'x' ? 'x1' : 'y1';
      return this.sv.range({
        ...range,
        [coordinate]: direction < 0 ? target : focus[coordinate],
        [edgeCoordinate]: direction > 0 ? target : focus[coordinate],
      });
    }

    const edgeFocus = { ...focus, [coordinate]: target };
    return this.sv.focus(edgeFocus, {
      [coordinate]: target - focus[coordinate],
    });
  }

  /** Monitor key direction changes */
  changeDirectionKey(
    e: KeyboardEvent,
    canRange: boolean,
  ): DirectionKeyChange | void {
    const isMulti = canRange && e.shiftKey;
    const hasPrimaryModifier = e.ctrlKey || e.metaKey;
    const isArrow = ARROW_CODES.includes(e.code);
    const isEdgeShortcut = hasPrimaryModifier && !e.altKey && isArrow;

    if (hasPrimaryModifier && !isEdgeShortcut) {
      return;
    }
    if (DIRECTION_CODES.has(e.code)) {
      e.preventDefault();
    }

    if (e.shiftKey) {
      switch (e.code) {
        case codesLetter.TAB:
          return { changes: { x: -1 }, isMulti: false };
      }
    }

    let changes: Partial<Cell>;
    switch (e.code) {
      case codesLetter.ARROW_UP:
        changes = { y: -1 };
        break;
      case codesLetter.ARROW_DOWN:
        changes = { y: 1 };
        break;
      case codesLetter.ARROW_LEFT:
        changes = { x: -1 };
        break;
      case codesLetter.TAB:
      case codesLetter.ARROW_RIGHT:
        changes = { x: 1 };
        break;
      default:
        return;
    }
    return { changes, isMulti, ...(isEdgeShortcut && { edge: true }) };
  }
}
