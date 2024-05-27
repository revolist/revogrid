### Usage Angular [Example](https://codesandbox.io/s/data-vue-test-3wkzi?file=/src/App.vue)

With NPM:

```bash
npm i @revolist/angular-datagrid --save;
```

With Yarn:

```bash
yarn add @revolist/angular-datagrid;
```

```ts
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RevogridModule } from '@revolist/angular-datagrid';

import { AppComponent } from './app.component';
import { CellComponent } from './cell.component';
import { EditorComponent } from './editor.component';

@NgModule({
  declarations: [
    AppComponent,
    CellComponent,
    EditorComponent,
  ],
  imports: [
    RevogridModule,
    BrowserModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}


// app.component.ts
import { Component, Injector } from '@angular/core';
import { ColumnRegular, Editors } from '@revolist/revogrid';
import { Template, Editor } from '@revolist/angular-datagrid';
import { CellComponent } from './cell.component';
import { EditorComponent } from './editor.component';

@Component({
  selector: 'app-root',
  template: `<revo-grid [source]="source" [columns]="columns" [editors]="editors"/>`,
})
export class AppComponent {
  source: any[] = [];
  columns: ColumnRegular[] = [];
  editors: Editors = {};

  constructor(private ref: Injector) {
    const MY_EDITOR = 'custom-editor';
    this.source = [
      {
        name: '1',
        details: 'Item 1',
      },
      {
        name: '2',
        details: 'Item 2',
      },
    ];
    this.columns = [
      {
        prop: 'name',
        name: 'First',
        editor: MY_EDITOR,
        cellTemplate: Template(CellComponent, ref),
      },
      {
        prop: 'details',
        name: 'Second',
      },
    ];


    this.editors = { [MY_EDITOR]: Editor(EditorComponent, ref) };
  }
}


// cell.component.ts
import { Component, Input } from '@angular/core';
import { ColumnDataSchemaModel } from '@revolist/revogrid';


@Component({
  selector: 'app-cell',
  template: '<span> {{value}} works!</span>',
})
export class CellComponent {
  @Input() props!: ColumnDataSchemaModel;

  get value() {
    return this.props.rowIndex;
  }
}


// editor.component.ts
import { Component, Input } from '@angular/core';
import { type EditorType } from '@revolist/angular-datagrid';

@Component({
  selector: 'app-editor',
  template: '<button (click)="testClick()">{{ props.val }} close!</button>',
})
export class EditorComponent {
  @Input() props!: EditorType;

  
  testClick() {
    this.props.close();
  }
}

```
