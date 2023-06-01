export function isMobileDevice() {
    return /Mobi/i.test(navigator.userAgent) || /Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0;
}
