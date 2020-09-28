import { Component, Listen, Method } from "@stencil/core";

@Component({ tag: 'revogr-clipboard' })
export class Clipboard {
    @Listen('copy', { target: 'document' })
    onCopy(e: ClipboardEvent): void {
        console.log(this.getData(e));
    }

    @Listen('paste', { target: 'document' })
    onPaste(e: ClipboardEvent): void {
        console.log(this.getData(e));
    }
    @Method() async copy(): Promise<void> {
        //
    }
    @Method() async paste(): Promise<void> {
    }
    render() {
    }

    private getData(e: ClipboardEvent): Object {
        return (e.clipboardData || (window as unknown as {clipboardData: DataTransfer|null})?.clipboardData).getData('text');
    }
}