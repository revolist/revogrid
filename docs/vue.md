# Vue

In order to use the custom element library within the Vue app, the application must be modified to define the custom elements and to inform the Vue compiler which elements to ignore during compilation. This can all be done within the `main.js` file.

Assuming you’ve run `npm install --save revo-grid` beforehand, and that `revo-grid` is the name of our made up Web Components that we have published to npm, you import the components into the 'main.js' file by

- importing the node module
- telling Vue to ignore the custom element tags (see `https://vuejs.org/v2/api/#ignoredElements`)
- binding the Stenciljs component code to the window object

```tsx
import Vue from 'vue';
import App from './App.vue';

import { applyPolyfills, defineCustomElements } from 'revo-grid/loader';

Vue.config.productionTip = false;

// Tell Vue to ignore all components defined in the revo-grids
// package. The regex assumes all components names are prefixed
// 'test'
Vue.config.ignoredElements = [/revo-\w*/];

// Bind the custom elements to the window object
applyPolyfills().then(() => {
  defineCustomElements();
});

new Vue({
  render: h => h(App)
}).$mount('#app');
```

The components should then be available in any of the Vue components
```tsx
render() {
  return (
    <div>
      <revo-grid></revo-grid>
    </div>
  )
}
```

Vue provides several different ways to install and use the framework in an application. The above technique for integrating a Stencil custom element library has been tested on a Vue application that was created using the `vue-cli` with ES2015 and WebPack as primary options. A similar technique should work if the application was generated using other options.