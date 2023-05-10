import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';
// import { angularOutputTarget } from '@stencil/angular-output-target';
// import { reactOutputTarget } from '@stencil/react-output-target';
// import { vueOutputTarget } from '@stencil/vue-output-target';
// import { svelteOutputTarget } from '@stencil/svelte-output-target';
// import { vueOutputTarget as vue2OutputTarget } from "@revolist/stencil-vue2-output-target";

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
  preamble: 'Built by Revolist',
  hashedFileNameLength: 8,
  invisiblePrehydration: false,
  extras: {
    // This is to tackle an Angular specific performance issue:
    initializeNextTick: true,
    // Don’t need any of these so setting them to “false”:
    scriptDataOpts: false,
    appendChildSlotFix: false,
    cloneNodeFix: false,
    slotChildNodesFix: false,
    experimentalImportInjection: true,
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

    vueOutputTarget({
      componentCorePackage,
      proxiesFile: directivesProxyFile('vue'),
      includeDefineCustomElements: true,
      componentModels: [],
    }),
    svelteOutputTarget({
        componentCorePackage,
        proxiesFile: directivesProxyFile('svelte'),
        includeDefineCustomElements: true,
        legacy: false,
        includePolyfills: false,
      }), */
    // vue2OutputTarget({
    //   componentCorePackage,
    //   proxiesFile: directivesProxyFile('vue2'),
    //   includeDefineCustomElements: true,
    //   loaderDir: 'custom-element',
    //   componentModels: [],
    // }),
    // custom element, no polifil
    {
      type: 'dist-custom-elements',
      dir: 'custom-element',
      customElementsExportBehavior: 'bundle', // stencil 3.0
      // autoDefineCustomElements: true,
      externalRuntime: true,
      empty: true,
    },
    {
      type: 'dist',
      esmLoaderPath: '../loader',
      empty: true,
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      copy: [{ src: 'serve', dest: '.' }, { src: '../node_modules/bootstrap/dist', dest: './bootstrap' }],
      serviceWorker: null, // disable service workers
    },
  ],
};
