import { execa } from 'execa';
import chalk from 'chalk';
import { packageDirs } from './package-dirs.mjs';

async function commitAndPushChanges(packageDir) {
    try {

      // Add changes
      await execa('git', ['add', '.'], { cwd: packageDir, stdio: 'inherit' });
  
      // Commit changes
      await execa('git', ['commit', '-m', `chore(update): packages synced.`], { cwd: packageDir, stdio: 'inherit' });
  
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
      await commitAndPushChanges(packageDir);
    }
    console.log(chalk.blue('All changes committed and pushed.'));
  })();
