import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';
import { reactOutputTarget } from '@stencil/react-output-target';


export const config: Config = {
  namespace: 'revo-grid',
  taskQueue: 'async',
  globalScript: './src/global/global.ts',
  plugins: [sass({
    injectGlobalPaths: [
      'src/global/_colors.scss',
      'src/global/_icons.scss'
    ]
  })],
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
      copy: [
        { src: 'assets' }
      ],
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
      proxiesFile: '../revogrid-react/src/revogrid.ts',
    }),
    {
      type: 'www',
      copy: [
        { src: 'utilsExternal' },
        { src: 'assets' }
      ],
      serviceWorker: null // disable service workers
    }
  ]
};
