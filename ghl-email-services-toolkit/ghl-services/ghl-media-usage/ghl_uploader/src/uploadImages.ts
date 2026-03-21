import {extname} from 'node:path';

import {listFilesInFolder, uploadImageToFolder} from './ghlClient.js';
import {
  type GhlMediaFile,
  type GhlRequestContext,
  type GhlUploadedImageResult,
  type GhlUploaderRuntime,
  type ParsedQualifierManifest,
  type QualifiedImage,
} from './types.js';

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'newsletter-image';
}

function inferExtension(image: QualifiedImage): string {
  const fromExplicit = image.fileExtension?.replace(/^\./, '');
  if (fromExplicit) {
    return fromExplicit;
  }
  const source = image.sourcePath ?? image.sourceUrl ?? '';
  const ext = extname(source).replace(/^\./, '');
  return ext || 'jpg';
}

export function createManagedFilename(
  image: QualifiedImage,
  topicSlug: string,
  runDate: string,
): string {
  const extension = inferExtension(image);
  return `nycpolicyscope-${image.slotId}-${runDate}-${slugify(topicSlug)}.${extension}`;
}

export async function uploadQualifiedImages(
  context: GhlRequestContext,
  folderId: string,
  manifest: ParsedQualifierManifest,
  runDate: string,
  runtime: GhlUploaderRuntime = {},
): Promise<
  | {ok: true; uploaded: GhlUploadedImageResult[]}
  | {
      ok: false;
      message: string;
      status: number | null;
      responseSnippet: string | null;
      endpoint?: string | null;
    }
> {
  const uploaded: GhlUploadedImageResult[] = [];

  for (const image of manifest.approvedImages) {
    const finalName = createManagedFilename(image, manifest.topicSlug, runDate);
    const uploadResult = await uploadImageToFolder(
      context,
      folderId,
      image,
      finalName,
      runtime,
    );

    if (!uploadResult.ok) {
      return {
        ok: false,
        message: uploadResult.message,
        status: uploadResult.status,
        responseSnippet: uploadResult.responseSnippet,
        endpoint: uploadResult.endpoint,
      };
    }

    let resolvedUrl = uploadResult.data.url;
    let matchedId = uploadResult.data.id;
    let matchedName = finalName;

    // If the upload response does not include the final hosted URL yet, briefly
    // re-read the folder contents so the caller still gets render-ready output.
    if (!resolvedUrl) {
      let matched: GhlMediaFile | undefined;
      let listResult;
      for (let attempts = 0; attempts < 3; attempts++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        listResult = await listFilesInFolder(context, folderId, runtime);
        if (!listResult.ok) {
          return {
            ok: false,
            message: listResult.message,
            status: listResult.status,
            responseSnippet: listResult.responseSnippet,
            endpoint: listResult.endpoint,
          };
        }

        matched =
          listResult.data.find(
            (file: GhlMediaFile) => file.id === uploadResult.data.id,
          ) ??
          listResult.data.find((file: GhlMediaFile) => file.name === finalName);

        if (matched?.url) {
          break;
        }
      }

      if (!matched?.url) {
        return {
          ok: false,
          message: `Unable to verify uploaded ${image.slotId} image in managed scope after retries.`,
          status: listResult?.status ?? null,
          responseSnippet: listResult?.responseSnippet ?? null,
          endpoint: listResult?.endpoint ?? null,
        };
      }
      resolvedUrl = matched.url;
      matchedId = matched.id;
      matchedName = matched.name ?? finalName;
    }

    uploaded.push({
      slotId: image.slotId,
      ghlFileId: matchedId,
      ghlUrl: resolvedUrl,
      name: matchedName,
      altText: image.imageAltText,
      folderId,
      sectionHeader: image.sectionHeader,
      referenceLink: image.referenceLink,
      provider: image.provider.provider,
      providerImageId: image.provider.providerImageId,
      providerUrl: image.provider.providerUrl,
    });
  }

  return {ok: true, uploaded};
}
