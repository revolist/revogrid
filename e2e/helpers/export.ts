import type { E2EPage } from '@stencil/playwright';

export async function getExportCsv(page: E2EPage): Promise<string | null> {
  return page.evaluate(async () => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
    if (!grid) {
      throw new Error('Grid element was not found');
    }
    const plugins = await grid.getPlugins();
    const exportPlugin = plugins.find(
      (plugin: { exportString?: unknown }) => typeof plugin.exportString === 'function',
    );
    if (!exportPlugin) {
      return null;
    }
    return await exportPlugin.exportString({ filename: 'e2e-export' });
  });
}
