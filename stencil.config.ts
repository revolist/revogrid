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

export const config: Config = {
  // https://github.com/ionic-team/stencil/blob/master/src/declarations/stencil-public-compiler.ts
  enableCache: true,
  hashFileNames: false,
  autoprefixCss: false,
  minifyCss: true,
  // preamble: 'Built by Revolist',
  hashedFileNameLength: 8,
  invisiblePrehydration: false,
  extras: {
    // We need the following for IE11 and old Edge:
    cssVarsShim: true,
    dynamicImportShim: true,
    // We don’t use shadow DOM so this is not needed:
    shadowDomShim: false,
    // Setting the below option to “true” will actually break Safari 10 support:
    safari10: false,
    // This is to tackle an Angular specific performance issue:
    initializeNextTick: true,
    // Don’t need any of these so setting them to “false”:
    scriptDataOpts: false,
    appendChildSlotFix: false,
    cloneNodeFix: false,
    slotChildNodesFix: false,
  },

  // buildEs5: 'prod',
  namespace: 'revo-grid',
  taskQueue: 'async',
  globalScript: './src/global/global.ts',
  plugins: [
    sass({
      injectGlobalPaths: [
        'src/global/_colors.scss',
        'src/global/_icons.scss',
        'src/global/_mixins.scss',
        'src/global/_buttons.scss'
      ],
    }),
  ],
  // proxies
  outputTargets: [
    vueOutputTarget({
      componentCorePackage,
      proxiesFile: directivesProxyFile('vue'),
      componentModels: [],
    }),
    /*
    angularOutputTarget({
      componentCorePackage,
      directivesProxyFile: directivesProxyFile('angular', `proxies/${entry}`),
      valueAccessorConfigs: [],
    }),
    reactOutputTarget({
      componentCorePackage,
      proxiesFile: directivesProxyFile('react'),
    }),
    svelteOutputTarget({
      componentCorePackage,
      proxiesFile: directivesProxyFile('svelte'),
    }), */
    // custom element, no polifil
    {
      type: 'dist-custom-elements',
      dir: 'custom-element',
      autoDefineCustomElements: true,
      empty: true,
    },
    // lazy loading
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
