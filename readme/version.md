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
