import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';
import { angularOutputTarget } from '@stencil/angular-output-target';
import { reactOutputTarget } from '@stencil/react-output-target';
import { vueOutputTarget } from '@stencil/vue-output-target';
import { svelteOutputTarget } from '@stencil/svelte-output-target';

const componentCorePackage = '@revolist/revogrid';
const parent = '../revogrid-proxy';
const entry = 'revogrid.ts';
const directivesProxyFile = (name: string, filepath = entry) => `${parent}/${name}/src/${filepath}`;
// proxies
export const config: Config = {
  buildEs5: 'prod',
  namespace: 'revo-grid',
  taskQueue: 'async',
  globalScript: './src/global/global.ts',
  plugins: [
    sass({
      injectGlobalPaths: ['src/global/_colors.scss', 'src/global/_icons.scss', 'src/global/_mixins.scss', 'src/global/_buttons.scss'],
    }),
  ],
  outputTargets: [
    angularOutputTarget({
      componentCorePackage,
      directivesProxyFile: directivesProxyFile('angular', `proxies/${entry}`),
      valueAccessorConfigs: [],
    }),
    reactOutputTarget({
      componentCorePackage,
      proxiesFile: directivesProxyFile('react'),
    }),
    vueOutputTarget({
      componentCorePackage,
      proxiesFile: directivesProxyFile('vue'),
      componentModels: [
        {
          elements: 'revo-dropdown',
          event: 'changeValue',
          targetAttr: 'changeValue',
        },
      ],
    }),
    svelteOutputTarget({
      componentCorePackage,
      proxiesFile: directivesProxyFile('svelte'),
    }),
    {
      type: 'dist-custom-elements-bundle',
    },
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      copy: [{ src: 'utilsExternal' }],
      serviceWorker: null, // disable service workers
    },
  ],
};
