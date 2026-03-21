import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {z} from 'zod';

import {parseFlagValue} from '../../internal-core/src/index.js';
import {loadGhlUploaderEnv} from '../ghl_uploader/src/auth.js';
import {listFolders} from '../ghl_uploader/src/ghlClient.js';
import {
  DEFAULT_MANAGED_FOLDER_NAME,
  type GhlMediaFolder,
  type GhlUploaderRuntime,
} from '../ghl_uploader/src/types.js';
import {uploadQualifiedImages} from '../ghl_uploader/src/uploadImages.js';

const manifestSchema = z.object({
  topicSlug: z.string().trim().min(1),
  approvedImages: z.array(
    z.object({
      slotId: z.string().trim().min(1),
      sourcePath: z.string().trim().min(1).optional(),
      sourceUrl: z.string().trim().url().optional(),
      fileExtension: z.string().trim().min(1).optional(),
      imageAltText: z.string().trim().min(1).optional(),
      sectionHeader: z.string().trim().min(1).optional(),
      referenceLink: z.string().trim().url().optional(),
      provider: z.object({
        provider: z.string().trim().min(1),
        providerImageId: z.string().trim().min(1),
        providerUrl: z.string().trim().url(),
      }),
    }),
  ),
});

export type QualifiedManifestInput = z.infer<typeof manifestSchema>;

export type PublishQualifiedImagesErrorCode =
  | 'MISSING_MANIFEST_PATH'
  | 'MANAGED_FOLDER_NOT_FOUND'
  | 'MANAGED_FOLDER_AMBIGUOUS'
  | 'UPLOAD_FAILED'
  | 'UNKNOWN_ERROR';

export interface PublishQualifiedImagesResult {
  ok: boolean;
  managedFolderId: string | null;
  managedFolderName: string;
  uploadedCount: number;
  renderReadyImages: Array<{
    slotId: string;
    ghlFileId: string;
    ghlUrl: string;
    altText?: string;
    provider: string;
    providerImageId: string;
    providerUrl: string;
    folderId: string;
    name: string;
  }>;
  message: string;
  errorCode?: PublishQualifiedImagesErrorCode;
}

function findManagedFolder(
  folders: GhlMediaFolder[],
  managedFolderName: string,
):
  | {ok: true; folder: GhlMediaFolder}
  | {ok: false; errorCode: PublishQualifiedImagesErrorCode; message: string} {
  const exactMatches = folders.filter(
    folder => folder.name.trim() === managedFolderName,
  );

  if (exactMatches.length === 1 && exactMatches[0]) {
    return {
      ok: true,
      folder: exactMatches[0],
    };
  }

  if (exactMatches.length > 1) {
    return {
      ok: false,
      errorCode: 'MANAGED_FOLDER_AMBIGUOUS',
      message: `Multiple folders matched ${managedFolderName}.`,
    };
  }

  return {
    ok: false,
    errorCode: 'MANAGED_FOLDER_NOT_FOUND',
    message: `Managed folder ${managedFolderName} was not found.`,
  };
}

export async function publishQualifiedImages(
  manifest: unknown,
  options: {
    managedFolderName?: string;
    runDate?: string;
    runtime?: GhlUploaderRuntime;
  } = {},
): Promise<PublishQualifiedImagesResult> {
  const parsedManifest = manifestSchema.parse(manifest);
  const managedFolderName =
    options.managedFolderName?.trim() || 'News Letter images';
  const env = loadGhlUploaderEnv(managedFolderName);

  if (!env.ok) {
    return {
      ok: false,
      managedFolderId: null,
      managedFolderName,
      uploadedCount: 0,
      renderReadyImages: [],
      message: env.message,
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  const folders = await listFolders(env.context, options.runtime);
  if (!folders.ok) {
    return {
      ok: false,
      managedFolderId: null,
      managedFolderName,
      uploadedCount: 0,
      renderReadyImages: [],
      message: folders.message,
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  const resolvedFolder = findManagedFolder(folders.data, managedFolderName);
  if (!resolvedFolder.ok) {
    return {
      ok: false,
      managedFolderId: null,
      managedFolderName,
      uploadedCount: 0,
      renderReadyImages: [],
      message: resolvedFolder.message,
      errorCode: resolvedFolder.errorCode,
    };
  }

  const upload = await uploadQualifiedImages(
    env.context,
    resolvedFolder.folder.id,
    parsedManifest,
    options.runDate ?? new Date().toISOString().slice(0, 10),
    options.runtime,
  );

  if (!upload.ok) {
    return {
      ok: false,
      managedFolderId: resolvedFolder.folder.id,
      managedFolderName,
      uploadedCount: 0,
      renderReadyImages: [],
      message: upload.message,
      errorCode: 'UPLOAD_FAILED',
    };
  }

  return {
    ok: true,
    managedFolderId: resolvedFolder.folder.id,
    managedFolderName,
    uploadedCount: upload.uploaded.length,
    renderReadyImages: upload.uploaded,
    message: 'Qualified images uploaded and normalized successfully.',
  };
}

export async function publishQualifiedImagesFromFile(
  manifestPath: string,
  options: {
    managedFolderName?: string;
    runDate?: string;
    runtime?: GhlUploaderRuntime;
  } = {},
): Promise<PublishQualifiedImagesResult> {
  const resolvedManifestPath = resolve(process.cwd(), manifestPath);
  const manifest = JSON.parse(
    await readFile(resolvedManifestPath, 'utf-8'),
  ) as QualifiedManifestInput;
  return publishQualifiedImages(manifest, options);
}

export function parsePublishQualifiedImagesArgs(args: string[]): {
  manifestPath?: string;
  managedFolderName: string;
  runDate?: string;
} {
  return {
    manifestPath: parseFlagValue(args, '--manifest'),
    managedFolderName:
      parseFlagValue(args, '--managed-folder-name') ??
      DEFAULT_MANAGED_FOLDER_NAME,
    runDate: parseFlagValue(args, '--run-date'),
  };
}
