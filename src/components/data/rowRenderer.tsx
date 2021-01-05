import { h, VNode } from "@stencil/core";

export interface RowProps {
    size: number;
    start: number;
    rowClass?: string;
}

const RowRenderer = ({rowClass, size, start}: RowProps, cells: VNode[]) => {
    return <div class={`row ${rowClass || ''}`} style={{ height: `${size}px`, transform: `translateY(${start}px)` }}>{cells}</div>
};

export default RowRenderer;
