import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildColumns,
  getExportCsv,
  mountGrid,
} from './helpers';

test.describe('export', () => {
  test('exports the visible grid data as csv', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      exporting: true,
    });

    const csv = await getExportCsv(page);
    expect(csv).toContain('\uFEFF');
    expect(csv).toContain('"ID","Name","Role","City"');
    expect(csv).toContain('1,Alice,Engineer,Lisbon');
    expect(csv).toContain('2,Ben,Designer,Porto');
  });
});
