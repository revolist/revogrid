import * as hydrate from '@revolist/revogrid/hydrate';
import type { HydrateResults } from '@revolist/revogrid/hydrate';

const result: Promise<HydrateResults> = hydrate.renderToString(
  '<html><body><revo-grid></revo-grid></body></html>',
);
const document: Promise<HydrateResults> = hydrate.hydrateDocument('<html></html>');

void [result, document];
