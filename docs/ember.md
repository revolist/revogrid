# Ember

Working with Stencil components in Ember is really easy thanks to the `ember-cli-stencil` addon. It handles:

- Importing the required files into your `vendor.js`
- Copying the component definitions into your `assets` directory
- Optionally generating a wrapper component for improved compatibility with older Ember versions

Start off by installing the Ember addon

```bash
ember install ember-cli-stencil
```

Now, when you build your application, Stencil collections in your dependencies will automatically be discovered and pulled into your application. You can just start using the custom elements in your `hbs` files with no further work needed. For more information, check out the [`ember-cli-stencil` documentation](https://github.com/alexlafroscia/ember-cli-stencil).