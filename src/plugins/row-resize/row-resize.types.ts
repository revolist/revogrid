import type { DimensionRows, ViewSettingSizeProp } from '@type';

export type RowResizeConfig = {
  /** Smallest height a user can assign. Defaults to 20px. */
  minHeight?: number;
  /** Optional largest height a user can assign. */
  maxHeight?: number;
  /** Makes the resize edge available across data rows, not only row headers. */
  fullRow?: boolean;
};

export type ResolvedRowResizeConfig = {
  minHeight: number;
  maxHeight?: number;
  fullRow: boolean;
};

export type RowResizeGridConfig = {
  resizeRow: boolean | RowResizeConfig;
};

export type RowResizeEventDetail = {
  /** Row dimension containing the resized rows. */
  rowType: DimensionRows;
  /** Boundary row whose handle started the gesture. */
  index: number;
  /** All virtual row indexes affected by this gesture. */
  indexes: number[];
  /** Current absolute height applied to every affected row. */
  size: number;
  /** Heights at the start of the gesture. */
  previousSizes: ViewSettingSizeProp;
  /** Most recent pointer event associated with this lifecycle event. */
  originalEvent: PointerEvent;
};

export type RowResizeCancelReason =
  | 'escape'
  | 'pointercancel'
  | 'blur'
  | 'destroy'
  | 'config-change'
  | 'data-change'
  | 'row-headers-hidden';

export type RowResizeCancelEventDetail = RowResizeEventDetail & {
  reason: RowResizeCancelReason;
};

declare global {
  interface HTMLRevoGridElementEventMap {
    beforerowresize: RowResizeEventDetail;
    rowresize: RowResizeEventDetail;
    afterrowresize: RowResizeEventDetail;
    rowresizecancel: RowResizeCancelEventDetail;
  }
}
