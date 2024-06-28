import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { packageDirs } from './package-dirs.mjs';

// Define __dirname and __filename for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from root package.json
const rootPackageJsonPath = path.resolve(__dirname, '../package.json');
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8'));
const newVersion = rootPackageJson.version;

if (!newVersion) {
  console.error(chalk.red('Error: Please provide a version using --version'));
  process.exit(1);
}

async function updateVersionInPackage(packageDir) {
  const fullPath = path.resolve(__dirname, '..', packageDir, 'release.mjs');
  try {
    await execa('node', [fullPath, '--version', newVersion], {
      stdio: 'inherit',
    });
    console.log(chalk.green(`Successfully updated version in ${packageDir}`));
  } catch (error) {
    console.error(chalk.red(`Failed to update version in ${packageDir}`));
    console.error(error);
  }
}

async function commitAndPushChanges(packageDir) {
  try {
    // Add changes
    await execa('git', ['add', '.'], { cwd: packageDir, stdio: 'inherit' });

    // Commit changes
    await execa('git', ['commit', '-m', `chore(release): update versions to ${newVersion}`], { cwd: packageDir, stdio: 'inherit' });

    // Push changes
    await execa('git', ['push'], { cwd: packageDir, stdio: 'inherit' });

    console.log(chalk.green(`Successfully committed and pushed version updates for ${packageDir} to GitHub`));
  } catch (error) {
    console.error(chalk.red(`Failed to commit and push changes for ${packageDir}`));
    console.error(error);
  }
}

(async () => {
  for (const packageDir of packageDirs) {
    await updateVersionInPackage(packageDir);
    // await commitAndPushChanges(packageDir);
  }
  console.log(chalk.blue('All versions updated.'));
})();
