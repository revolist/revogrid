export function isSafariDesktop() {
    return /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent) && !navigator.userAgent.match(/(iPad|iPhone|iPod)/g);
}
