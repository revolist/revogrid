# React

## Package installation

RevoGrid provide special wrapper for React. Just import it to your project and it can be used as part of react system.

```jsx
import {RevoGrid} from '@revolist/revogrid-react';

// jsx
<RevoGrid columns={this.state.columns} source={this.state.source} onAfterEdit={this.afterEdit}/>;
```

## Advanced manual installation

With an application built using the `create-react-app` script the easiest way to include the component library is to call `defineCustomElements()` from the `index.js` file.
Note that in this scenario `applyPolyfills` is needed if you are targeting Edge or IE11.

```tsx
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

import { applyPolyfills, defineCustomElements } from 'revo-grid/loader';

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();

applyPolyfills().then(() => {
  defineCustomElements();
});
```

Following the steps above will enable your web components to be used in React, however there are some additional complexities that must also be considered.  https://custom-elements-everywhere.com/ contains a synopsis of the current issues.

## Properties and Events

The largest deficiencies that React currently has when it comes to working with standard HTML Custom Elements is that properties that contain non-scalar data (that is, data that is not a string or number) are not passed properly and custom events are not handled properly. The solution to both of these problems is to wrap the Custom Element in a React component, obtain a `ref` to the Custom Element, and use the `ref` in order to set the non-scalar properties and add event listeners via `addEventListener`. Here is an example showing how this works for the property passing:

```tsx
import React, { useRef, useEffect } from 'react';
import { Forecast } from '../models';
import { iconPaths } from '../util';

const DailyForecast: React.FC<{ forecast: Forecast; scale: string }> = ({ forecast, scale }) => {
  const elementRef = useRef(null);

  useEffect(() => {
    (elementRef.current as any)!.iconPaths = iconPaths;
    (elementRef.current as any)!.forecasts = forecast;
  }, [forecast]);

  return <kws-daily-forecast scale={scale} ref={elementRef}></kws-daily-forecast>;
};

export default DailyForecast;
```

In this example, there are three properties: `forecast` is an array of objects, `iconPaths` is an object, and `scale` is a string. Since `scale` is a string it can be handled normally. However, the other two properties are non-scalar and must be set via the `ref` to the Custom Element. Wrapping the Custom Element as such prevents you from having to obtain a `ref` with every instance of `kws-daily-forecast` that you may need since you will instead be using the `DailyForecast` React component as such:

```tsx
<DailyForecast scale={scale} forecast={f}></DailyForecast>
```

## The Stencil DS Proxy Plugin

Manually wrapping all Custom Elements in a React Component is a good practice, but it gets tedious quickly. For that reason, we suggest using the <a href="https://github.com/ionic-team/stencil-ds-plugins" target="_blank">Stencil DS Plugins</a> to do the work for you. These are a set of Stencil output target plugins that create the Custom Element proxies for you. Please refer to the <a href="https://github.com/ionic-team/stencil-ds-plugins/blob/master/README.md" target="_blank">Stencil DS Plugin documentation</a> for details.