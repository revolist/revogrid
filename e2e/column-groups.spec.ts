import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  dataCell,
  expectChildHeaderUnderGroup,
  mountGrid,
  withHeaderTestId,
  type SampleRow,
} from './helpers';

test.describe('column groups', () => {
  test('renders column groups correctly', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 401, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 402, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      {
        name: 'Identity',
        ...withHeaderTestId('group-identity'),
        children: [
          { prop: 'id', name: 'ID', ...withHeaderTestId('child-id') },
          { prop: 'name', name: 'Name', ...withHeaderTestId('child-name') },
        ],
      },
      {
        name: 'Details',
        ...withHeaderTestId('group-details'),
        children: [
          { prop: 'role', name: 'Role', ...withHeaderTestId('child-role') },
          { prop: 'city', name: 'City', ...withHeaderTestId('child-city') },
        ],
      },
    ]);

    await mountGrid(page, { columns, source });

    await expect(page.getByTestId('group-identity')).toBeVisible();
    await expect(page.getByTestId('group-details')).toBeVisible();
    await expect(page.getByTestId('child-id')).toBeVisible();
    await expect(page.getByTestId('child-name')).toBeVisible();
    await expect(page.getByTestId('child-role')).toBeVisible();
    await expect(page.getByTestId('child-city')).toBeVisible();

    await expectChildHeaderUnderGroup(page, 'child-id', 'group-identity');
    await expectChildHeaderUnderGroup(page, 'child-name', 'group-identity');
    await expectChildHeaderUnderGroup(page, 'child-role', 'group-details');
    await expectChildHeaderUnderGroup(page, 'child-city', 'group-details');
  });

  test('keeps first data row editable below deep column groups', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      {
        name: 'Level 1',
        children: [
          {
            name: 'Level 2',
            children: [
              {
                name: 'Level 3',
                children: [
                  {
                    name: 'Level 4',
                    children: [
                      {
                        name: 'Level 5',
                        children: [
                          { prop: 'id', name: 'ID' },
                          { prop: 'name', name: 'Name' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { prop: 'role', name: 'Role' },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      resize: true,
      rowSize: 30,
      colSize: 120,
    });

    const firstCell = dataCell(page, 0, 1);
    await expect(firstCell).toHaveText('Alice');

    const layout = await firstCell.evaluate(element => {
      const header = document.querySelector('revo-grid revogr-header');
      const cellRect = element.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();
      return {
        headerBottom: headerRect?.bottom ?? 0,
        cellTop: cellRect.top,
      };
    });

    expect(layout.cellTop).toBeGreaterThanOrEqual(layout.headerBottom);

    const hitTarget = await firstCell.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const target = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return {
        tagName: target?.tagName,
        className: target instanceof HTMLElement ? target.className : '',
        dataRow: target instanceof HTMLElement ? target.getAttribute('data-rgrow') : null,
        dataCol: target instanceof HTMLElement ? target.getAttribute('data-rgcol') : null,
      };
    });

    expect(hitTarget).toMatchObject({
      tagName: 'DIV',
      dataRow: '0',
      dataCol: '1',
    });
    expect(String(hitTarget.className)).toContain('rgCell');
    expect(String(hitTarget.className)).not.toContain('rgHeaderCell');
    expect(String(hitTarget.className)).not.toContain('resizable');

    await firstCell.dblclick();
    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
  });
});
