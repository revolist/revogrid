import type { E2EPage } from '@stencil/playwright';

type ClipboardAction = {
  type: 'copy' | 'cut' | 'paste';
  text?: string;
  html?: string;
  waitForWrite?: boolean;
};

async function runClipboardAction(
  page: E2EPage,
  action: ClipboardAction,
): Promise<string | void> {
  return page.evaluate(async currentAction => {
    class DataTransferStub {
      data: Record<string, string> = {};
      types: string[] = [];

      setData(type: string, value: string) {
        this.data[type] = value;
        if (type === 'text/plain') {
          this.data.text = value;
        }
        if (type === 'text') {
          this.data['text/plain'] = value;
        }
        if (!this.types.includes(type)) {
          this.types.push(type);
        }
        if (type === 'text/plain' && !this.types.includes('text')) {
          this.types.push('text');
        }
      }

      getData(type: string) {
        if (type === 'text') {
          return this.data.text ?? this.data['text/plain'] ?? '';
        }
        if (type === 'text/plain') {
          return this.data['text/plain'] ?? this.data.text ?? '';
        }
        return this.data[type] ?? '';
      }
    }

    const clipboardData = new DataTransferStub();
    if (currentAction.type === 'paste') {
      if (currentAction.text) {
        clipboardData.setData('text/plain', currentAction.text);
      }
      if (currentAction.html) {
        clipboardData.setData('text/html', currentAction.html);
      }
    }

    const event = new Event(currentAction.type, {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData?: DataTransferStub };
    Object.defineProperty(event, 'clipboardData', {
      value: clipboardData,
      configurable: true,
    });

    document.dispatchEvent(event);

    if (currentAction.waitForWrite) {
      await Promise.resolve();
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      return clipboardData.getData('text/plain');
    }
  }, action);
}

export async function dispatchClipboardEvent(
  page: E2EPage,
  type: 'copy' | 'cut' | 'paste',
  text = '',
  html = '',
): Promise<void> {
  await runClipboardAction(page, { type, text, html });
  await page.waitForChanges();
}

export async function getCopiedText(page: E2EPage): Promise<string> {
  const copiedText = await runClipboardAction(page, {
    type: 'copy',
    waitForWrite: true,
  });
  return typeof copiedText === 'string' ? copiedText : '';
}
