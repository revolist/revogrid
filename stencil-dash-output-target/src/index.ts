import type {
  Config,
  Diagnostic,
  OutputTargetCustom,
} from '@stencil/core/internal';

import {
  generateReactComponent,
  resolveOutputDirectory,
  validateDashOutputTargetOptions,
} from './generator.js';
import type {
  DashComponentMeta,
  DashOutputTargetOptions,
} from './types.js';

export * from './generator.js';
export * from './types.js';

function addDiagnostics(
  diagnostics: Diagnostic[],
  messages: readonly string[],
): void {
  for (const messageText of messages) {
    diagnostics.push({
      level: 'error',
      type: 'build',
      header: 'Dash output target',
      messageText,
      lines: [],
    });
  }
}

export function dashOutputTarget(
  options: DashOutputTargetOptions,
): OutputTargetCustom {
  return {
    type: 'custom',
    name: 'dash-react-bridge',
    taskShouldRun: 'onBuildOnly',
    validate(_config: Config, diagnostics: Diagnostic[]) {
      addDiagnostics(
        diagnostics,
        validateDashOutputTargetOptions(options),
      );
    },
    async generator(config, compilerCtx, buildCtx) {
      const errors = validateDashOutputTargetOptions(options);
      if (errors.length) {
        throw new Error(errors.join('; '));
      }
      const requestedComponents = options.components
        ? new Set(options.components)
        : null;
      const components = (buildCtx.components as DashComponentMeta[])
        .filter(
          component =>
            !component.internal &&
            (!requestedComponents ||
              requestedComponents.has(component.tagName)),
        )
        .sort((left, right) => left.tagName.localeCompare(right.tagName));
      if (!components.length) {
        throw new Error('Dash output target did not match any components');
      }
      if (requestedComponents) {
        const found = new Set(components.map(component => component.tagName));
        const missing = [...requestedComponents].filter(
          component => !found.has(component),
        );
        if (missing.length) {
          throw new Error(
            `Dash output target components not found: ${missing.sort().join(', ')}`,
          );
        }
      }
      const outputDir = resolveOutputDirectory(
        config.rootDir || process.cwd(),
        options.outputDir,
      );
      const generated = components.map(component =>
        generateReactComponent(component, options),
      );
      await Promise.all(
        generated.map(file =>
          compilerCtx.fs.writeFile(
            `${outputDir}/${file.fileName}`,
            file.source,
          ),
        ),
      );
      const indexSource = `${generated
        .map(
          file =>
            `export { default as ${file.componentName} } from './${file.fileName}';`,
        )
        .join('\n')}\n`;
      await compilerCtx.fs.writeFile(`${outputDir}/index.js`, indexSource);
    },
  };
}
