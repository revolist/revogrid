import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';
import { reactOutputTarget } from '@stencil/react-output-target';


export const config: Config = {
  namespace: 'revo-grid',
  taskQueue: 'async',
  plugins: [sass()],
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader'
    },
    {
      type: 'docs-readme'
    },
    {
      type: 'docs-vscode',
      file: 'custom-elements.json'
    },
    reactOutputTarget({
      componentCorePackage: '@revolist/revogrid',
      proxiesFile: 'revogrid-react/src/revogrid.ts',
    }),
    {
      type: 'www',
      copy: [
        { src: 'utilsExternal' }
      ],
      serviceWorker: null // disable service workers
    }
  ]
};
