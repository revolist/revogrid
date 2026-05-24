import { OutputTargetCustom } from '@stencil/core/internal';
import json2md from 'json2md';

const supplementalEvents = [
  {
    name: 'columndragstart',
    type: 'ColumnDragStartEventData',
    component: 'revo-grid',
    description:
      'Triggered when a column drag operation starts. Call preventDefault() to prevent the column move.',
  },
  {
    name: 'columndragmousemove',
    type: 'MouseEvent',
    component: 'revo-grid',
    description: 'Fired while a column drag operation is moving.',
  },
  {
    name: 'beforecolumndragend',
    type: 'BeforeColumnDragEndEventData',
    component: 'revo-grid',
    description:
      'Fired before the column drag operation is applied. Call preventDefault() to reject the move.',
  },
  {
    name: 'columndragend',
    type: 'ColumnDragEventData',
    component: 'revo-grid',
    description:
      'Fired when the column drag operation completes. Includes reordered columns, physical order, and viewport type.',
  },
] as const;

/**
 * Adds plugin-dispatched events that are not present in Stencil component
 * metadata, while keeping them near the header events that own column dragging.
 */
function addSupplementalEventsAfterHeader<T extends { name: string }>(
  events: T[],
): (T | (typeof supplementalEvents)[number])[] {
  const headerEndIndex = events.findIndex(
    event => event.name === 'afterheaderrender',
  );
  if (headerEndIndex === -1) {
    return [...events, ...supplementalEvents];
  }
  return [
    ...events.slice(0, headerEndIndex + 1),
    ...supplementalEvents,
    ...events.slice(headerEndIndex + 1),
  ];
}

export const eventListOutputTarget = (outputTarget: {
  mdPath: string;
  tsPath: string;
  footer?: string;
}): OutputTargetCustom => ({
  type: 'custom',
  name: 'event-list-generator',
  async generator(_, compilerCtx, buildCtx) {
    const timespan = buildCtx.createTimeSpan(`generate event-list`, true);
    const componentEvents = buildCtx.components.flatMap(c =>
      c.events.map(event => ({
        name: event.name,
        type: event.complexType.resolved,
        component: c.tagName,
        description: event.docs.text.replace(/\n/g, ' '),
      })),
    );
    const events = addSupplementalEventsAfterHeader(componentEvents);

    const md = `---
aside: false
---

${json2md(
      [
        {
          h1: 'Revogrid Events',
        },
        {
          table: {
            headers: ['Name', 'Type', 'Component', 'Description'],
            rows: events.map(event => [
              event.name,
              `\`${event.type.replace(/(?<!\\)\|/g, '\\|')}\``,
              event.component,
              event.description,
            ]),
          },
        },
      ],
      '',
      '',
    )}

${outputTarget.footer || ''}`;

    // Collecting and filtering unique event names
    const eventNames = events.map(event => event.name);

    // Generate the TypeScript Set file content
    const setContent = `
export type RevogridEvents = ${eventNames.map(name => `'${name}'`).join('|\n  ')}
export const REVOGRID_EVENTS = new Map<RevogridEvents, RevogridEvents>([
  ${eventNames.map(name => `['${name}', '${name}']`).join(',\n  ')}
]);
`;
    await compilerCtx.fs.writeFile(outputTarget.tsPath, setContent);
    await compilerCtx.fs.writeFile(outputTarget.mdPath, md);
    timespan.finish(`generate event-list finished`);
  },
});
