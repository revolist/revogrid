import KeyCodesEnum, { codesLetter, keyValues } from './key.codes';
import OsPlatform from './platform';

export function isLetterKey(code: number): boolean {
  return (
    code === 32 || // space
    (code >= 48 && code <= 57) ||
    (code >= 96 && code <= 111) ||
    (code >= 186 && code <= 192) ||
    (code >= 219 && code <= 222) ||
    code >= 226 ||
    (code >= 65 && code <= 90)
  ); // a-z
}

export function isMetaKey(code: number): boolean {
  const keys: KeyCodesEnum[] = [
    KeyCodesEnum.ARROW_DOWN,
    KeyCodesEnum.ARROW_UP,
    KeyCodesEnum.ARROW_LEFT,
    KeyCodesEnum.ARROW_RIGHT,
    KeyCodesEnum.HOME,
    KeyCodesEnum.END,
    KeyCodesEnum.DELETE,
    KeyCodesEnum.BACKSPACE,
    KeyCodesEnum.F1,
    KeyCodesEnum.F2,
    KeyCodesEnum.F3,
    KeyCodesEnum.F4,
    KeyCodesEnum.F5,
    KeyCodesEnum.F6,
    KeyCodesEnum.F7,
    KeyCodesEnum.F8,
    KeyCodesEnum.F9,
    KeyCodesEnum.F10,
    KeyCodesEnum.F11,
    KeyCodesEnum.F12,
    KeyCodesEnum.TAB,
    KeyCodesEnum.PAGE_DOWN,
    KeyCodesEnum.PAGE_UP,
    KeyCodesEnum.ENTER,
    KeyCodesEnum.ESCAPE,
    KeyCodesEnum.SHIFT,
    KeyCodesEnum.CAPS_LOCK,
    KeyCodesEnum.ALT,
  ];

  return keys.indexOf(code) !== -1;
}

// navigator.platform
export function isCtrlKey(code: number, platform: string): boolean {
  if (platform.includes(OsPlatform.mac)) {
    return [
      KeyCodesEnum.COMMAND_LEFT,
      KeyCodesEnum.COMMAND_RIGHT,
      KeyCodesEnum.COMMAND_FIREFOX,
    ].includes(code);
  }

  return code === KeyCodesEnum.CONTROL;
}

export function isCtrlMetaKey(code: KeyCodesEnum): boolean {
  return [
    KeyCodesEnum.CONTROL,
    KeyCodesEnum.COMMAND_LEFT,
    KeyCodesEnum.COMMAND_RIGHT,
    KeyCodesEnum.COMMAND_FIREFOX,
  ].includes(code);
}

export function isClear(code: string): boolean {
  return codesLetter.BACKSPACE === code || codesLetter.DELETE === code;
}

export function isTab(code: string): boolean {
  return codesLetter.TAB === code;
}
export function isTabKeyValue(key: string): boolean {
  return keyValues.TAB === key;
}

export function isEnterKeyValue(key: string): boolean {
  return keyValues.ENTER === key;
}

export function isCut(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey && event.code === 'KeyX') || // Ctrl + X on Windows
    (event.metaKey && event.code === 'KeyX')
  ); // Cmd + X on Mac
}
export function isCopy(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey && event.code === 'KeyC') || // Ctrl + C on Windows
    (event.metaKey && event.code === 'KeyC')
  ); // Cmd + C on Mac
}
export function isPaste(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey && event.code === 'KeyV') || // Ctrl + V on Windows
    (event.metaKey && event.code === 'KeyV')
  ); // Cmd + V on Mac
}
export function isAll(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey && event.code === 'KeyA') || // Ctrl + A on Windows
    (event.metaKey && event.code === 'KeyA')
  ); // Cmd + A on Mac
}
