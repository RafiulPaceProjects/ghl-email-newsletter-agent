import {spawnSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(currentDir, './src/publish-rendered.cli.ts');

const child = spawnSync(
  process.execPath,
  ['--import', 'tsx', cliPath, ...process.argv.slice(2)],
  {
    cwd: currentDir,
    env: {
      ...process.env,
    },
    encoding: 'utf8',
  },
);

if (child.stdout) {
  process.stdout.write(child.stdout);
}

if (child.stderr) {
  process.stderr.write(child.stderr);
}

process.exitCode = child.status ?? 1;
