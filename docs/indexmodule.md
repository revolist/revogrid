# Import as module

Alternatively, if you wanted to take advantage of ES Modules, you could include the components using an import statement.
Note that in this scenario applyPolyfills is needed if you are targeting Edge or IE11.

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
        import { defineCustomElements, applyPolyfills } from 'https://unpkg.com/@revolist/revogrid@latest/loader/index.es2017.js';
        defineCustomElements();
    </script>
  </head>
  <body>
    // after you imported file to your project simply define component
    <revo-grid class="grid-component" />
  </body>
</html>
```