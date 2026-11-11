# RevoGrid accessibility

RevoGrid provides keyboard navigation, screen-reader-oriented grid semantics, visible cell focus, configurable layouts and high-contrast themes. The same core web component is used by the React, Vue, Angular, Svelte and vanilla JavaScript integrations.

This document describes the open-source grid's implemented accessibility features and the checks needed when integrating it into an application. Use [WCAG 2.2 Level A and AA](https://www.w3.org/TR/WCAG22/) when assessing the complete page, including its data, templates, editors and enabled plugins.

## Keyboard navigation

RevoGrid uses spreadsheet-style navigation within the focused grid.

| Shortcut                                        | Behavior                                                     |
| ----------------------------------------------- | ------------------------------------------------------------ |
| Arrow keys                                      | Move the focused cell in the corresponding direction.        |
| Tab / Shift+Tab                                 | Move cell focus right / left within the grid.                |
| Ctrl+Arrow on Windows/Linux, Cmd+Arrow on macOS | Move to the first or last row or column in that direction.   |
| Shift+Arrow                                     | Extend the active selection when `range` is enabled.         |
| Ctrl/Cmd+Shift+Arrow                            | Extend the selection to a grid edge when `range` is enabled. |
| Enter or a printable character                  | Start editing an editable focused cell.                      |
| Enter while using the built-in text editor      | Save the edit.                                               |
| Tab while using the built-in text editor        | Save the edit and navigate to the next cell.                 |
| Escape while editing                            | Cancel the edit.                                             |
| Backspace / Delete                              | Clear the editable selection.                                |
| Ctrl/Cmd+A                                      | Select all cells when `range` is enabled.                    |
| Ctrl/Cmd+C, X or V                              | Copy, cut or paste when `useClipboard` is enabled.           |

Editing follows the grid and column `readonly` settings. Custom editors must preserve equivalent keyboard access and cancellation behavior. Keep `canFocus` enabled for the built-in cell-focus workflow.

See the [keyboard guide](https://rv-grid.com/guide/keyboard) for configuration and customization. Tab is used for cell navigation; verify an explicit, discoverable keyboard route into and out of the grid in the surrounding application.

## Screen reader support

Accessibility behavior is enabled by default through `accessible: true`.

- The grid exposes a `treegrid` role, a keyboard entry point and row and column counts.
- Rendered rows, column headers and data cells expose `row`, `columnheader` and `gridcell` roles.
- Cells provide one-based row and column indices to describe their logical positions in virtualized data.
- Pinned top, main and pinned bottom rows use a shared index sequence. Counts and offsets update when those sections change length.
- The accessibility plugin moves DOM focus to a cell after the grid applies a focus change.

Give each grid a meaningful accessible name using standard HTML attributes such as `aria-label` or `aria-labelledby`. Provide clear column names and descriptions of unusual keyboard workflows. For example:

```html
<h2 id="revenue-heading">Quarterly revenue</h2>
<p id="revenue-help">
  Use arrow keys to move between cells. Press Enter to edit.
</p>
<revo-grid
  aria-labelledby="revenue-heading"
  aria-describedby="revenue-help"
></revo-grid>
```

Virtualization renders the visible part of the data, so test reading and navigation across scrolling boundaries with the screen readers your application supports. Accessible counts and indices do not make offscreen cells available in the DOM. Custom cell and header properties must preserve the built-in roles and indices.

## Color, contrast and focus

- The grid draws a border around the focused cell and provides selection colors through theme tokens.
- Opt-in `highContrastTheme` and `highContrastDarkTheme` presets provide light and dark high-contrast presentations when registered through `themeDefinitions`.
- Custom themes can adjust text, backgrounds, borders, selection colors, typography and row density.
- The filter panel includes reduced-motion styling.

Check the final foreground/background combinations, focus visibility and non-color state cues after applying custom themes, cell styles and templates. High-contrast presets and browser forced-colors mode are separate presentations; validate forced colors independently. Reduced-motion behavior in custom renderers and additional plugins also needs application testing.

## Zoom, larger text and layout

- Row heights and column widths are configurable. Use `rowSize`, column sizing and custom theme typography to provide enough room for larger text and interactive content.
- The grid scrolls its two-dimensional data viewport rather than requiring the entire page to scroll horizontally.
- Custom templates can provide wrapping and additional layout space where the data needs it.

Verify browser zoom, text enlargement and text-spacing overrides in the integrated application. Fixed row heights, pinned sections and custom editors must remain readable and reachable. Keep the page's surrounding navigation, help and forms responsive even when the grid needs local horizontal scrolling.

## Pointer, touch and alternatives to dragging

Cell navigation, range selection and text editing have keyboard workflows alongside pointer interaction. Clipboard actions can also be invoked from the keyboard when enabled.

Optional column movement, row resizing, drag selection and application-specific drag-and-drop features need an equivalent non-dragging workflow where they are required to complete a task. Provide keyboard or click/tap commands for those actions and check the size and spacing of their controls. Enabling a draggable feature alone does not supply every alternative interaction.

## Language and direction

- `rtl` enables right-to-left grid layouts.
- Applications supply column names, data text, custom editor labels and instructions.
- Filter configuration supports localized captions.

Translate accessible names and feedback alongside visible text. Set the page language and provide the appropriate direction for the surrounding interface. Custom renderers and editors must preserve the language and direction of their content.

## Feature coverage

| Area                          | Implemented features                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Grid structure                | Grid, row, header and cell roles, logical row/column counts and one-based indices.                  |
| Virtualized and pinned data   | Indices across row sections, updated counts and focus transfer to rendered cells.                   |
| Cell navigation and selection | Arrow and Tab navigation, grid-edge shortcuts and keyboard range selection.                         |
| Editing and clipboard         | Native text editing, save/cancel actions, clearing and configurable clipboard shortcuts.            |
| Themes and density            | Focus borders, light/dark high-contrast presets and configurable colors, typography and dimensions. |
| Internationalization          | RTL layout, application-supplied content and configurable filter captions.                          |

This coverage applies to the core grid. Framework templates, custom editors and optional or Pro plugins add their own interaction requirements and should be assessed separately.

## Application integration checklist

- Keep accessibility and cell focus enabled; name the grid and explain any custom shortcuts.
- Make entering and leaving the grid possible without a pointer. Verify focus return when an editor or popup closes.
- Give custom buttons, inputs and editor controls accessible names. Preserve meaningful roles, values and states.
- Connect validation errors to editor fields and announce application-owned loading, save, filter-result and error feedback when needed.
- Check contrast, zoom, text spacing, forced colors, reduced motion and touch targets in the chosen themes.
- Provide non-dragging alternatives for essential resize, reorder and drag-and-drop actions.
- Check keyboard and screen-reader behavior with realistic data, pinned sections, virtual scrolling and all enabled plugins.

## How we check accessibility

The repository includes automated regression coverage for:

- [ARIA roles and one-based indices, including changing pinned-row counts](e2e/accessibility.spec.ts).
- [Keyboard navigation, range extension and keeping the focused cell visible](e2e/navigation.spec.ts).
- [Editing and cancellation](e2e/editing.spec.ts), [range selection](e2e/range.spec.ts) and [clipboard interactions](e2e/clipboard.spec.ts).
- [Theme behavior and high-contrast grid separators](e2e/theme.spec.ts).

These tests exercise specific contracts. Manual screen-reader verification, zoom/reflow checks and a complete WCAG assessment of the finished application remain necessary. Record the browser, operating system, assistive technology, theme and tested workflows when performing that validation. This document records implementation and test coverage, not completed VoiceOver, NVDA or JAWS test results.

## Report an accessibility issue

[Open an issue on GitHub](https://github.com/revolist/revogrid/issues) with the grid version, browser, operating system, assistive technology when applicable, enabled plugins and steps to reproduce the problem. Include a minimal example and the expected keyboard or announcement behavior where possible.
