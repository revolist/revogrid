# Esm modules

This may be preferred for projects that are already handling bundling, lazy-loading and defining the custom elements themselves.
This solution quite popular for such tools like vite, parcel and other bundlers.


Be sure to set @stencil/core as a dependency of the package.
```
{
  "dependencies": {
    "@stencil/core": "latest"
  },
  ...
}
```

Below is an example of defining a custom element within the bundle:
```
import { defineCustomElements } from '@revolist/revogrid/custom-element';
defineCustomElements();
```

Custom element builds each component as a stand-alone class that extends HTMLElement.
The output is a standardized custom element with the styles already attached and without any of lazy-loading.


The dist output target, on the other hand, is more for projects that want to allow components to lazy-load themselves, without having to setup bundling configurations to do so.

Luckily, both builds can be generated at the same time, using the same source code, and shipped in the same distribution. It would be up to the consumer of your component library to decide which build to use.

If the library is to be used on IE11 we recommend using lazy loading shipment.
