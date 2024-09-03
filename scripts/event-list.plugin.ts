import { OutputTargetCustom } from '@stencil/core/internal';
import json2md from 'json2md';

export const eventListOutputTarget = (outputTarget: {
    mdPath: string;
    tsPath: string;
}): OutputTargetCustom => ({
  type: 'custom',
  name: 'event-list-generator',
  async generator(_, compilerCtx, buildCtx) {
    const timespan = buildCtx.createTimeSpan(`generate event-list`, true);

    const md = json2md(
      [
        {
          h1: 'Events',
        },
        {
          table: {
            headers: ['Name', 'Type', 'Component', 'Description'],
            rows: buildCtx.components.flatMap(c =>
              c.events.map(event => [
                event.name,
                `\`${event.complexType.resolved.replace(/(?<!\\)\|/g, '\\|')}\``,
                c.tagName,
                event.docs.text.replace(/\n/g, ' '),
              ]),
            ),
          },
        },
      ],
      '',
      '',
    );
    // mdContent = md;

    // Collecting and filtering unique event names
    const eventNames = buildCtx.components.flatMap(c =>
      c.events.map(event => event.name),
    );

    // Generate the TypeScript Set file content
    const setContent = `
export type RevogridEvents = ${eventNames.map(name => `'${name}'`).join('|\n  ')}
export const REVOGRID_EVENTS = new Map<RevogridEvents, RevogridEvents>([
  ${eventNames.map(name => `['${name}', '${name}']`).join(',\n  ')}
]);`;
    await compilerCtx.fs.writeFile(outputTarget.tsPath, setContent);
    await compilerCtx.fs.writeFile(outputTarget.mdPath, md);
    timespan.finish(`generate event-list finished`);
  },
});
