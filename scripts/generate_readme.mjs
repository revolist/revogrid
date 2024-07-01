import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

async function generateReadme(files, output) {
  try {
    // Clear the existing README.md if it exists
    await fs.writeFile(output, '');

    // Loop through each file and append its contents to README.md
    for (const file of files) {
      const filePath = path.join('readme', file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(chalk.green(`Processing ${file}...`));
        await fs.appendFile(output, content + '\n\n'); // Add a newline for separation between sections
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(chalk.yellow(`Warning: ${file} not found, skipping.`));
        } else {
          throw err;
        }
      }
    }

    console.log(chalk.green('README.md has been successfully generated.'));
  } catch (err) {
    console.error(chalk.red(`Error generating README.md: ${err.message}`));
  }
}

function main() {

  const packages = ['angular', 'react', 'svelte', 'vue2', 'vue3', ''];
  packages.forEach(pkg => {
    const files = ['banner.md', 'features.md'];
    let output = 'README.md';
    switch (pkg) {
      case 'angular':
        files.push('usage.angular.md');
        output = `packages/${pkg}/${output}`;
        break;
      case 'react':
        files.push('usage.react.md');
        output = `packages/${pkg}/${output}`;
        break;
      case 'svelte':
        files.push('usage.svelte.md');
        output = `packages/${pkg}/${output}`;
        break;
      case 'vue2':
        files.push('usage.vue2.md');
        output = `packages/${pkg}/${output}`;
        break;
      case 'vue3':
        files.push('usage.vue3.md');
        output = `packages/${pkg}/${output}`;
        break;
      default:
        files.push('framework.md', 'install.md', 'usage.basic.md', 'usage.js.md');
        break;
    }

    files.push('version.md', 'sponsors.md', 'contribute.md', 'LICENSE.md');
    generateReadme(files, output);
  });
}

main();
