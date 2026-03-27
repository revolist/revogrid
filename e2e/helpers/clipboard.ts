import type { E2EPage } from '@stencil/playwright';

export async function dispatchClipboardEvent(
  page: E2EPage,
  type: 'copy' | 'cut' | 'paste',
  text = '',
): Promise<void> {
  await page.evaluate(({ eventType, eventText }) => {
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
    if (eventType === 'paste') {
      clipboardData.setData('text/plain', eventText);
    }
    const event = new Event(eventType, {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData?: DataTransferStub };
    Object.defineProperty(event, 'clipboardData', {
      value: clipboardData,
      configurable: true,
    });
    document.dispatchEvent(event);
  }, { eventType: type, eventText: text });
  await page.waitForChanges();
}

export async function getCopiedText(page: E2EPage): Promise<string> {
  return page.evaluate(async () => {
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
    const event = new Event('copy', {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData?: DataTransferStub };
    Object.defineProperty(event, 'clipboardData', {
      value: clipboardData,
      configurable: true,
    });
    document.dispatchEvent(event);
    await Promise.resolve();
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    return clipboardData.getData('text/plain');
  });
}
