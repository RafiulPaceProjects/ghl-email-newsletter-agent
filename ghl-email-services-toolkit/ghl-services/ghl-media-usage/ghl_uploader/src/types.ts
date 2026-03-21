/**
 * Shared constants and contracts for the early GHL uploader source. Keeping
 * them together makes the partial media-upload stage easier to follow even
 * before it is wired into its own package-level validation flow.
 */
export {
  GHL_API_VERSION,
  GHL_BASE_URL,
  RESPONSE_SNIPPET_MAX_LENGTH,
} from '../../../internal-core/src/index.js';
export const DEFAULT_MANAGED_FOLDER_NAME = 'News Letter images';

export type GhlUploaderErrorCode =
  | 'MISSING_TOKEN'
  | 'MISSING_LOCATION_ID'
  | 'NETWORK_ERROR'
  | 'UPLOAD_FAILED'
  | 'UNKNOWN_ERROR';

export interface GhlUploaderDiagnostics {
  status: number | null;
  responseSnippet: string | null;
  endpoint: string | null;
}

export interface GhlRequestContext {
  token: string;
  locationId: string;
  managedFolderName: string;
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface GhlApiFailure {
  ok: false;
  status: number | null;
  endpoint: string;
  message: string;
  responseSnippet: string | null;
}

export interface GhlApiSuccess<T> {
  ok: true;
  status: number;
  endpoint: string;
  data: T;
  responseSnippet: string | null;
}

export type GhlApiResult<T> = GhlApiFailure | GhlApiSuccess<T>;

export interface GhlMediaFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface GhlMediaFile {
  id: string;
  name: string;
  folderId: string | null;
  url: string | null;
  mimeType: string | null;
}

export interface QualifiedImageProvider {
  provider: string;
  providerImageId: string;
  providerUrl: string;
}

export interface QualifiedImage {
  slotId: string;
  sourcePath?: string;
  sourceUrl?: string;
  fileExtension?: string;
  imageAltText?: string;
  sectionHeader?: string;
  referenceLink?: string;
  provider: QualifiedImageProvider;
}

export interface ParsedQualifierManifest {
  topicSlug: string;
  approvedImages: QualifiedImage[];
}

export interface GhlUploadedImageResult {
  slotId: string;
  ghlFileId: string;
  ghlUrl: string;
  name: string;
  altText?: string;
  folderId: string;
  sectionHeader?: string;
  referenceLink?: string;
  provider: string;
  providerImageId: string;
  providerUrl: string;
}

export interface GhlUploaderRuntime {
  fetchImpl?: FetchLike;
  readFile?: (path: string) => Promise<Uint8Array>;
}
