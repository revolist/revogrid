import { h } from "@stencil/core";
import { JSXBase, VNode } from "@stencil/core/internal";

interface Props extends Partial<JSXBase.ButtonHTMLAttributes<HTMLButtonElement>> {

}

export const RevoButton = (props: Props, children: VNode[]) => {
    return <button {...props} class={{
        ...(typeof props.class === 'object' ? props.class : props.class ? { [props.class]: true } : ''),
        ['revo-button']: true
    }}>{children}</button>;
}
