import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const mainRepoLink = 'https://github.com/revolist/revogrid';
const stencilJSLink = 'https://stenciljs.com';

async function generateReadme(files, output, variables, pkg) {
  try {
    // Clear the existing README.md if it exists
    await fs.writeFile(output, '');

    // Loop through each file and append its contents to README.md
    for (const file of files) {
      const filePath = path.join('readme', file);
      try {
        let content = await fs.readFile(filePath, 'utf-8');
        console.log(chalk.blue(`Processing ${file}...`));

        // Replace variables in the content
        content = content.replace(/\{\{(\w+)\}\}/g, (_, variable) => {
          return variables[variable] || `{{${variable}}}`; // Replace or keep the placeholder if not found
        });

        await fs.appendFile(output, content + '\n\n'); // Add a newline for separation between sections
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(chalk.yellow(`Warning: ${file} not found, skipping.`));
        } else {
          throw err;
        }
      }
    }

    console.log(chalk.green(`${pkg || 'JS'}: README.md successfully generated`));
  } catch (err) {
    console.error(chalk.red(`Error generating README.md: ${err.message}`));
  }
}

function main() {

  const packages = ['angular', 'react', 'svelte', 'vue2', 'vue3', ''];
  packages.forEach(pkg => {
    const variables = {
      logo: 'RevoGrid Data Grid',
      description: `Powerful data grid component built with <a href="${stencilJSLink}" target="_blank">StencilJS</a>.`
    };
    const files = ['banner.md', 'features.md'];
    let output = 'README.md';
    switch (pkg) {
      case 'angular':
        variables.description = `Powerful Angular Data Grid component built on top of <a href="${mainRepoLink}" target="_blank">RevoGrid</a>.`;
        variables.logo = 'Angular Data Grid';
        files.push('usage.deprecated.md', 'angular.usage.md');
        output = `packages/${pkg}/${output}`;
        break;
      case 'react':
        variables.description = `Powerful React Data Grid component built on top of <a href="${mainRepoLink}" target="_blank">RevoGrid</a>.`;
        variables.logo = 'React Data Grid';
        files.unshift('react.title.md');
        files.push('react.cell.md', 'usage.deprecated.md', 'react.install.md', 'react.usage.md');
        output = `packages/${pkg}/${output}`;
        break;
      case 'svelte':
        variables.description = `Powerful Svelte Data Grid component built on top of <a href="${mainRepoLink}" target="_blank">RevoGrid</a>.`;
        variables.logo = 'Svelte Data Grid';
        files.push('usage.deprecated.md', 'svelte.usage.md', 'svelte-5.usage.md');
        output = `packages/${pkg}/${output}`;
        break;
      case 'vue2':
        variables.description = `Powerful Vue 2 Data Grid component built on top of <a href="${mainRepoLink}" target="_blank">RevoGrid</a>.`;
        variables.logo = 'Vue 2 Data Grid';
        files.unshift('vue2.title.md');
        files.push('usage.deprecated.md', 'vue2.usage.md');
        output = `packages/${pkg}/${output}`;
        break;
      case 'vue3':
        variables.description = `Powerful Vue 3 Data Grid component built on top of <a href="${mainRepoLink}" target="_blank">RevoGrid</a>.`;
        variables.logo = 'Vue 3 Data Grid';
        files.push('usage.deprecated.md', 'vue3.usage.md');
        output = `packages/${pkg}/${output}`;
        break;
      default:
        files.push('framework.md', 'install.md', 'install.framework.md', 'usage.basic.md', 'js.usage.md');
        break;
    }

    files.push('install.framework.md', 'version.md', 'sponsors.md', 'contribute.md', 'LICENSE.md');
    generateReadme(files, output, variables, pkg);
  });
}

main();
