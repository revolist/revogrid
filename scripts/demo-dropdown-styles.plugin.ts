import type { OutputTargetCustom } from '@stencil/core/internal';
import { join } from 'node:path';
import { compile } from 'sass-embedded';

export const demoDropdownStyles: OutputTargetCustom = {
  type: 'custom',
  name: 'demo-dropdown-styles',
  async generator(config, compilerCtx) {
    const dropdownStyles = require.resolve('@revolist/ui/dropdown/editor-dropdown.style.scss');
    const { css } = compile(dropdownStyles, { style: 'compressed' });
    for (const target of config.outputTargets ?? []) {
      if (target.type === 'www' && target.dir) {
        await compilerCtx.fs.writeFile(join(target.dir, 'revo-ui/dropdown.css'), css);
      }
    }
  },
};
