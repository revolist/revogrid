<p align="center">
  <a href="https://rv-grid.com">
    <img src="./assets/logo.svg" alt="RevoGrid" height="150" />
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@revolist/revogrid"><img src="https://img.shields.io/npm/v/@revolist/revogrid" alt="Latest Version on NPM"/></a>
  <a href="https://github.com/revolist/revogrid/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/@revolist/revogrid" alt="Software License"/></a>
  <img src="https://badgen.net/bundlephobia/dependency-count/@revolist/revogrid@latest" alt="Tree shaking"/>
  <img src="https://badgen.net/bundlephobia/tree-shaking/@revolist/revogrid@latest" alt="Tree shaking"/>
  <img src="https://sonarcloud.io/api/project_badges/measure?project=revolist_revogrid&metric=alert_status" alt="Sonar Quality Gate"/>
</p>

#

<h3 align="center">Powerful data grid component built with <a href="https://stenciljs.com" target="_blank">StencilJS</a>.</h3>
<p align="center">
Support Millions of cells and thousands of columns easy and efficiently for fast data rendering. Easy to use.
  
</p>

<p align="center">
  <a href="https://rv-grid.com">Demo and API</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#basic-usage">How To Use</a> •
  <a href="#installation">Installation</a> •
  <a href="https://rv-grid.com/guide/">Docs</a> •
  <a href="#license">License</a>
</p>

<img src="./assets/material.jpg" alt="Material grid preview" width="100%" />
<i>RevoGrid material theme.</i>
<br>

## Key Features

- **High Performance**: Handles millions of cells in the viewport with a powerful core built by default.

- **Keyboard Support**:
  - Excel-like focus for efficient navigation and editing.
  - Seamless copy/paste from Excel, Google Sheets, or any other sheet format.


- **Lightweight**: Minimal initial bundle size ![Min size](https://badgen.net/bundlephobia/min/@revolist/revogrid@latest). Can be imported with polyfills or as a module for modern browsers.

- **Intelligent Virtual DOM**: Smart row recombination to minimize redraws.

- **Sorting**: Multiple options, customizable per column, with advanced event handling.

- **Filtering**:
  - Predefined system filters.
  - Preserve existing collections.
  - Custom filters to extend system filters with your own set.

- **Export**: Export data to file.

- **Custom Sizes**: Define custom sizes for columns and rows. Automatic sizing based on content.

- **Column Resizing**: Adjust column widths.

- **Pinned/Sticky/Freezed Elements**:
  - Columns (define left or right).
  - Rows (define top or bottom).

- **Grouping**:
  - Column grouping (nested headers).
  - Row grouping (nested rows).

- **Cell Editing**: In-place editing of cell data.

- **Customizations**:
  - Column header template.
  - Row header template.
  - Cell template (create your own cell views).
  - Cell editor (use predefined or apply your own custom editors and cell types).
  - Cell properties (define custom properties for rendered cells).

- **Column Types**: [More details](https://rv-grid.com/guide/column/#Column-Formats)
  - Text/String (default).
  - Number.
  - Select.
  - Date.
  - Custom (create extended styles using any template).

- **Drag and Drop**: Easily reorder rows.

- **Range Operations**:
  - Selection.
  - Editing.

- **Theme Packages**:
  - Excel-like (default).
  - Material (compact, dark, or light).

- **Extensibility**: Modern VNode features and tsx support for easy extension.

- **Trimmed Rows**: Hide rows on demand.

- **Plugin System**: Create custom plugins or extend existing ones easily.

- **Additional Customizations and Improvements**: Explore hundreds of other small customizations and improvements in [RevoGrid](https://rv-grid.com/).

<br>



<h2 align="center">Framework Friendly</h2>

<p align="center">
<img src="./assets/framework.png" alt="Framework friendly" width="100%" max-width="500px" style="max-width: 600px"/>
<p align="center">
<i>I am RevoGrid, your solution for efficiently representing large datasets <br /> in an "Excel-like" data table or as a list. Render native components inside each cell!</i>
</p>
</p>

<br>
<br>
<br>


## Installation

The library published as a [scoped NPM package](https://docs.npmjs.com/misc/scope) in the [NPMJS Revolist account](https://www.npmjs.com/org/revolist).
[Check for more info on our demo side](https://rv-grid.com/guide/installation).

With NPM:

```bash
npm i @revolist/revogrid --save;
```

With Yarn:

```bash
yarn add @revolist/revogrid;
```

## Browser Support

| ![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png) | ![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png) | ![Safari](https://raw.github.com/alrra/browser-logos/master/src/safari/safari_48x48.png) | ![Opera](https://raw.github.com/alrra/browser-logos/master/src/opera/opera_48x48.png) | ![Edge](https://raw.github.com/alrra/browser-logos/master/src/edge/edge_48x48.png) |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Latest ✔   | Latest ✔ | Latest ✔ | Latest ✔ | Latest ✔ |
|

## Framework

In `<revo-grid />` we have developed a sophisticated Continuous Delivery (CD) system powered by GitHub Actions. This advanced system automatically builds and delivers grid versions across multiple frameworks, including React, Angular, Svelte, Vue 2, and Vue 3, with full type support. This ensures continuous version delivery, providing the latest grid enhancements and upgrades across all supported frameworks ✨. In the future (version 5), we are planning to switch to monorepo based development.

- [JavaScript](https://rv-grid.com/guide/);
- [VueJs](https://rv-grid.com/guide/vue3/);
- [Svelte](https://rv-grid.com/guide/svelte/);
- [React](https://rv-grid.com/guide/react/);
- [Angular](https://rv-grid.com/guide/angular/).


## Basic Usage

RevoGrid functions as a web component. Simply place the component on your page and access its properties as you would with any other HTML element. It also offers multiple ways to integrate our grid into your project:

- [Import the grid into your project](https://rv-grid.com/guide/installation)

### Vanilla JS Grid Usage

```javascript
// Select the RevoGrid element from the DOM
const grid = document.querySelector('revo-grid');

// Define the columns for the grid
const columns = [
  { prop: 'name', name: 'First Column' }, // Simple column definition
  {
    prop: 'details',
    name: 'Second Column',
    // Custom cell template for the 'details' column
    cellTemplate: (createElement, props) => {
      return createElement(
        'div',
        {
          style: { backgroundColor: 'red' }, // Styling the cell background
          class: { 'inner-cell': true }, // Adding a CSS class
        },
        props.model[props.prop] || '' // Display the cell content or an empty string if undefined
      );
    },
  },
];

// Define the data source for the grid
const items = [{ name: 'New Item', details: 'Item Description' }];

// Assign the columns and data source to the grid
grid.columns = columns;
grid.source = items;
```


[Example and guide](https://rv-grid.com/guide/)


## Versions

- **2.0+**: Introduced the plugin system, grouping, sorting, and filtering.
- **3.0+**: Breaking changes introduced:
    -   Removed the redundant viewport component.
    -   Renamed classes to support Bootstrap and other libraries:
        -   `row` -> `rgRow`
        -   `col` -> `rgCol`
        -   `data-cell` -> `rgCell`
        -   `data-header-cell` -> `rgHeaderCell`
    -   Migrated all method names to lowercase to align with modern event naming conventions. For example, `afterEdit` is now `afteredit`. Check the API for details.
    -   Added support for pure ESM modules to enable the use of the grid in all modern frontend tooling like Vite, Parcel, etc. You can now import custom elements without lazy loading. Note that you are responsible for polyfills.


- **4.0+**: Breaking changes introduced. See the [migration guide](https://rv-grid.com/guide/migration). 

-   Redesigned type support:
        - Removed deprecated namespaces:
            - **Before**: `RevoGrid.ColumnDataSchemaRegular`
            - **Now**: `ColumnDataSchemaRegular`;
        - Improved type import:
            - **Before**: `import { RevoGrid } from '@revolist/revogrid/dist/types/interfaces'`
            - **Now**: `import { ColumnDataSchemaRegular } from '@revolist/revogrid'`.
        - Changed viewport type names everywhere. For example, before: `rowDefinitions: [{ type: "row", index: 0, size: 145 }]`, after: `rowDefinitions: [{ type: "rgRow", index: 0, size: 145 }]`.
    -   Updated [event](https://rv-grid.com/guide/api/revoGrid.html#Events) naming convention. Review your [event](https://rv-grid.com/guide/api/revoGrid.html#Events) usage. [Event names](https://rv-grid.com/guide/api/revoGrid.html#Events) are all lowercase now and are aligned with modern event naming conventions. For example, `afterEdit` -> `afteredit`.
    - Multiple event breaking changes introduced: beforerowrender now returns `BeforeRowRenderEvent`. Check all events for details.

-   **Major improvements**:
    -   Rethought the entire framework approach. Introduced Pro version with advance support and pro features.
    -   Introduced slot support.
    -   Updated scrolling system for better mobile support.
    -   Advance template support. Introduced `additionalData` for templates and editors. `Prop` gives access to parent/root app context.
    -   Redesigned the documentation.
    -   Fixed major issues and significantly improved overall performance, making the grid multiple time faster.
    -   Enhanced plugin support - now with full access to grid providers.
    -   Updated documentation.
    -   Provided full framework support and native render for  Angular, React, Svelte and Vue.
-   **What next?**
    -   Check our [Roadmap](https://github.com/users/revolist/projects/3)


## Our Sponsors

We would like to extend our heartfelt gratitude to our sponsors for their generous support. Their contributions help us maintain and develop RevoGrid, ensuring continuous improvements and updates.

[![Altruistiq](https://cdn.prod.website-files.com/62cd69e08130a1a33f5ef900/6310b4d500e971695db5e9c3_615b5db69ce8931a276e5ed2_Social_Icons_AQ_3_32x32.png)](https://altruistiq.com)


### Become a Sponsor

If you or your company would like to support the ongoing development of RevoGrid, please consider becoming a sponsor or use or [Pro version](https://rv-grid.com/pro/). Your support will help us continue to improve the project and provide the best possible tool for the community.

[![Sponsor Us](https://img.shields.io/badge/Sponsor%20Us-%F0%9F%92%96-brightgreen)](https://opencollective.com/revogrid)

Thank you for supporting RevoGrid! 🙏

## Contributing

We invite you to join our vibrant community and contribute to the growth and success of RevoGrid. By getting involved, you'll have the opportunity to enhance your skills, gain valuable experience, and make a significant impact on an innovative project.

### Why Contribute?

- **Expand Your Knowledge**: Working on RevoGrid allows you to dive deep into modern web technologies, improve your coding skills, and learn best practices in performance optimization, data handling, and component-based architecture.
- **Valuable Experience**: Contributing to an open-source project like RevoGrid provides you with practical experience that can be a great addition to your portfolio. It demonstrates your ability to work collaboratively, solve complex problems, and contribute to a project's success.
- **Professional Growth**: By contributing, you become part of a network of talented developers. This can lead to mentorship opportunities, collaborations, and professional connections that can benefit your career.
- **Make a Difference**: Your contributions can help improve RevoGrid, making it more powerful and user-friendly for developers around the world. Your input can shape the future of the project and drive innovation.

### Join Us

Your contribution, no matter how big or small, is valuable. By working on RevoGrid, you'll be part of an exciting project that's making a difference in the world of data grids. Join us today and let's build something amazing together!

## License

MIT

---

