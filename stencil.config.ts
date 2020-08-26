import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';

export const config: Config = {
  namespace: 'revo-grid',
  taskQueue: 'async',
  plugins: [sass()],
  outputTargets: [
    {
      type: 'dist'
    },
    {
      type: 'docs-readme'
    },
    {
      type: 'www',
      copy: [
        { src: 'utilsExternal' }
      ],
      serviceWorker: null // disable service workers
    }
  ]
};
