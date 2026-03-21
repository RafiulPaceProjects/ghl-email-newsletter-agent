import {mkdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';

export interface ResolvedArtifactPath {
  outputPath: string;
  outputDir: string;
}

export function resolveArtifactPath(
  cwd: string,
  outputDir: string,
  fileName: string,
): ResolvedArtifactPath {
  const resolvedDir = resolve(cwd, outputDir);
  return {
    outputDir: resolvedDir,
    outputPath: resolve(resolvedDir, fileName),
  };
}

export async function ensureArtifactDirectory(path: string): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
}
