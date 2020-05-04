# Components without a Framework

Integrating a component built with Stencil to a project without a JavaScript framework is straight forward. If you're using a simple HTML page, you can add your component via a script tag. For example, if we published a component to npm, we could load the component through unpkg like this:

```markup
<!DOCTYPE html>
<html lang="en">
<head>
  <script src="https://unpkg.com/revo-grids/latest/dist/revo-grids.js"></script>
</head>
<body>
  <revo-grid></revo-grid>
</body>
</html>
```

Alternatively, if you wanted to take advantage of ES Modules, you could include the components using an import statement. Note that in this scenario `applyPolyfills` is needed if you are targeting Edge or IE11.

```markup
<!DOCTYPE html>
<html lang="en">
<head>
  <script type="module">
    import { applyPolyfills, defineCustomElements } from 'https://unpkg.com/revo-grids/loader';
    applyPolyfills().then(() => {
      defineCustomElements();
    });
  </script>
</head>
<body>
  <revo-grid></revo-grid>
</body>
</html>
```

## Passing object props from a non-JSX element

### Setting the prop manually

```tsx
import { Prop } from '@stencil/core';

export class TodoList {
  @Prop() myObject: object;
  @Prop() myArray: Array<string>;
}
```

```tsx
<todo-list></todo-list>
<script>
  const todoListElement = document.querySelector('todo-list');
  todoListElement.myObject = {};
  todoListElement.myArray = [];
</script>
```

### Watching props changes

```tsx
import { Prop, State, Watch } from '@stencil/core';

export class TodoList {
  @Prop() myObject: string;
  @Prop() myArray: string;
  @State() myInnerObject: object;
  @State() myInnerArray: Array<string>;

  componentWillLoad() {
    this.parseMyObjectProp(this.myObject);
    this.parseMyArrayProp(this.myArray);
  }

  @Watch('myObject')
  parseMyObjectProp(newValue: string) {
    if (newValue) this.myInnerObject = JSON.parse(newValue);
  }

  @Watch('myArray')
  parseMyArrayProp(newValue: string) {
    if (newValue) this.myInnerArray = JSON.parse(newValue);
  }
}
```

```tsx
<todo-list my-object="{}" my-array="[]"></todo-list>
```