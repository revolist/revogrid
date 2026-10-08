import { Readable } from 'node:stream';
import { hydrateDocument, HydrateResults } from '../hydrate';

const html = '<html><body></body></html>';
const promise: Promise<HydrateResults>[] = [
  hydrateDocument(html),
  hydrateDocument(html, {}),
  hydrateDocument(html, undefined, false),
  hydrateDocument(html, {}, false),
  hydrateDocument(html, undefined, undefined),
];
declare const asStream: boolean;
const streaming: Readable | Promise<HydrateResults> = hydrateDocument(
  html,
  {},
  true,
);
const conditional: Readable | Promise<HydrateResults> = hydrateDocument(
  html,
  undefined,
  asStream,
);

// Streaming can return a Promise when input is invalid or setup throws.
// @ts-expect-error The Promise fallback must be handled before using stream APIs.
const streamOnly: Readable = hydrateDocument(html, {}, true);
// @ts-expect-error A dynamic boolean can return a stream.
const promiseOnly: Promise<HydrateResults> = hydrateDocument(
  html,
  {},
  asStream,
);
// @ts-expect-error Explicit false always returns a Promise.
const falseStream: Readable = hydrateDocument(html, {}, false);

void [promise, streaming, conditional, streamOnly, promiseOnly, falseStream];
