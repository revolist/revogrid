  - [Cell template](https://rv-grid.com/guide/angular/renderer) (create your own cell views).
  - [Cell editor](https://rv-grid.com/guide/angular/editor) (use predefined or apply your own custom editors and cell types).

- **Rich API & Additional Improvements**: Explore hundreds of other small customizations and improvements in [RevoGrid](https://rv-grid.com/).



### Usage Angular

With NPM:

```bash
npm i @revolist/angular-datagrid --save;
```

With Yarn:

```bash
yarn add @revolist/angular-datagrid;
```

[Example and guide](https://rv-grid.com/guide/angular/)


#### Standalone Components

From Angular CLI v17+, the default behavior is to generate a new project with standalone components.

```ts
import "@angular/compiler";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [],
}).catch((err) =>
  console.error(err)
);
```

```ts
// app.component.ts

import { Component } from "@angular/core";
import { RevoGrid, Template, Editor, Editors, ColumnRegular } from "@revolist/angular-datagrid";
import { CellComponent } from './cell.component';
import { EditorComponent } from './editor.component';


const MY_EDITOR = 'custom-editor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RevoGrid, CellComponent, EditorComponent],
  template: `<revo-grid [source]="source" [columns]="columns" [editors]="editors"/>`,
})
export class AppComponent {
    source = [
    {
      name: "1",
      details: "Item 1",
    },
    {
      name: "2",
      details: "Item 2",
    },
  ];
  columns: ColumnRegular[] = [
      {
        prop: 'name',
        name: 'First',
        editor: MY_EDITOR,
        cellTemplate: Template(CellComponent),
      },
      {
        prop: 'details',
        name: 'Second',
      },
  ];
  editors: Editors = { [MY_EDITOR]: Editor(EditorComponent) };
}
```

```ts
// cell.component.ts
import { Component, Input } from '@angular/core';
import { ColumnDataSchemaModel } from '@revolist/revogrid';


@Component({
  selector: 'app-cell',
  standalone: true,
  template: '<span> {{value}} works!</span>',
})
export class CellComponent {
  @Input() props!: ColumnDataSchemaModel;

  get value() {
    return this.props.rowIndex;
  }
}
```

```ts
// editor.component.ts
import { Component, Input } from '@angular/core';
import { type EditorType } from '@revolist/angular-datagrid';

@Component({
  selector: 'app-editor',
  standalone: true,
  template: '<button (click)="testClick()">{{ props.val }} close!</button>',
})
export class EditorComponent {
  @Input() props!: EditorType;

  
  testClick() {
    this.props.close();
  }
}

```
