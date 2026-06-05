## Key Features

- **High Performance**: Render 1M+ rows and millions of cells with no hard row limit in the grid. Virtualization keeps the DOM focused on the visible viewport.

- **[Accessibility](https://rv-grid.com/guide/wcag)**: Follows WAI-ARIA best practices.

- **[RTL Support](https://rv-grid.com/guide/rtl)**: Comprehensive Right-to-Left language support for Arabic, Hebrew, Persian, and other RTL languages. Features automatic column reordering, proper text alignment, and layout adjustments for RTL interfaces.

- **[Keyboard Support](https://rv-grid.com/guide/defs#Keyboard)**:
  - Excel-like focus for efficient navigation and editing.
  - Seamless copy/paste from Excel, Google Sheets, or any other sheet format.


- **Lightweight**: Minimal initial bundle size ![Min size](https://badgen.net/bundlephobia/min/@revolist/revogrid@latest). Can be imported with polyfills or as a module for modern browsers.

- **[Intelligent Virtual DOM](https://rv-grid.com/guide/overview#VNode-Reactive-DOM)**: Smart row recombination to minimize redraws.

- **[Virtual Scroll](https://rv-grid.com/guide/viewports)**: Handles large datasets without rendering every row or column into the DOM.

- **[Drag and Drop](https://rv-grid.com/guide/row/order)**: Drag and drop in [rows](https://rv-grid.com/guide/row/order) and [columns](https://rv-grid.com/guide/column/order).

- **[Sorting](https://rv-grid.com/guide/sorting)**: Multiple options, customizable per column, with advanced event handling.

- **[Filtering](https://rv-grid.com/guide/filters)**:
  - Predefined system filters.
  - Multi column filters.
  - Conditional filters.
  - Preserve existing collections.
  - Selection.
  - Slider.
  - Header filtering.
  - Custom filters to extend system filters with your own set.

- **[Export](https://rv-grid.com/guide/export.plugin)**:
  - **[CSV](https://rv-grid.com/guide/export.plugin)**: Built-in file export for core RevoGrid data workflows.
  - **[PDF](https://rv-grid.com/guide/pdf-export)**: Browser-side PDF export with the lightweight [`@revolist/revogrid-pdf-export`](https://www.npmjs.com/package/@revolist/revogrid-pdf-export) plugin.
  - **[Excel (Pro)](https://rv-grid.com/guide/data-grid-export-excel)**: Workbook export for RevoGrid Pro with layout, styles, frozen panes, merged cells, and formulas.

- **Custom Sizes**: Define custom sizes for [columns](https://rv-grid.com/guide/column/#Column-Size) and [rows](https://rv-grid.com/guide/row/height). Automatic sizing based on content.

- **[Column Resizing](https://rv-grid.com/guide/column/resize)**: Adjust column widths.
- **Auto Size Columns**: Intelligent column width adjustment that automatically adapts to content, ensuring optimal readability and layout efficiency.

- **Pinned/Sticky/Freezed Elements**:
  - [Columns](https://rv-grid.com/guide/column/pin) (define left or right).
  - [Rows](https://rv-grid.com/guide/row/pin) (define top or bottom).

- **Grouping**:
  - [Column grouping](https://rv-grid.com/guide/column/grouping) (nested headers).
  - Column grouping Drill Down: Collapse grouping columns to streamline your grid view, trimming away unnecessary columns and enhancing data organization. Perfect for focusing on the information that matters most, while keeping your workspace clean and efficient.
  - [Row grouping](https://rv-grid.com/guide/row/grouping) (nested rows).

- **Column Types**: [More details](https://rv-grid.com/guide/column/#Column-Formats)
  - [Text/String](https://rv-grid.com/guide/column/types#String) (default).
  - [Number](https://rv-grid.com/guide/column/types#Number).
  - [Select/Dropdown](https://rv-grid.com/guide/column/types#Select-Dropdown).
  - [Date](https://rv-grid.com/guide/column/types#Date).
  - Custom (create extended styles using any template).

- **Range Operations**:
  - [Selection](https://rv-grid.com/guide/defs#Range).
  - [Editing](https://rv-grid.com/guide/defs#Range-Autofill).

- **[Theme Packages](https://rv-grid.com/guide/theme)**:
  - Excel-like (default).
  - Material (compact, dark, or light).

- **[Extensibility](https://rv-grid.com/guide/jsx.template)**: Modern VNode features and tsx support for easy extension.

- **[Trimmed Rows](https://rv-grid.com/guide/row/#Trimmed-Rows)**: Hide rows on demand.

- **[Plugin System](https://rv-grid.com/guide/plugin/)**: Create custom plugins or extend existing ones easily.

- **Customizations**:
  - [Column header template](https://rv-grid.com/guide/column/header.template).
  - [Row header template](https://rv-grid.com/guide/row/headers).
  - [Cell properties](https://rv-grid.com/guide/cell/) (define custom properties for rendered cells).
  - [Cell template](https://rv-grid.com/guide/cell/renderer) (create your own cell views).
  - [Cell editor](https://rv-grid.com/guide/cell/editor) (use predefined or apply your own custom editors and cell types).

- **[AI Agents and MCP](https://rv-grid.com/guide/mcp)**: Connect Codex, Cursor, Claude Code, and VS Code to version-aware RevoGrid docs, examples, migrations, feature availability, and typed API context.

- **Rich API & Additional Improvements**: Explore hundreds of other small customizations and improvements in [RevoGrid](https://rv-grid.com/).
