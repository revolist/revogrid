declare var generateHeader: { (index: number): string };
declare var generateHeaderByCount: {(colsNumber: number): string[]};
declare module 'generate-header' {
    export = generateHeader;
}
export {generateHeader, generateHeaderByCount};