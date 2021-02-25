import KeyCodesEnum, { codesLetter } from './keyCodes';
import OsPlatform from './platform';
import includes from 'lodash/includes';

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
    return includes([KeyCodesEnum.COMMAND_LEFT, KeyCodesEnum.COMMAND_RIGHT, KeyCodesEnum.COMMAND_FIREFOX], code);
  }

  return KeyCodesEnum.CONTROL === code;
}

export function isCtrlMetaKey(code: KeyCodesEnum): boolean {
  return includes([KeyCodesEnum.CONTROL, KeyCodesEnum.COMMAND_LEFT, KeyCodesEnum.COMMAND_RIGHT, KeyCodesEnum.COMMAND_FIREFOX], code);
}

export function isClear(code: string): boolean {
  return codesLetter.BACKSPACE === code || codesLetter.DELETE === code;
}

export function isTab(code: string): boolean {
  return codesLetter.TAB === code;
}

export function isEnterKey(code: string): boolean {
  return code === codesLetter.ENTER || code === codesLetter.ENTER_NUM;
}
