# AGENTS.md

## Purpose

This document defines how an automation agent should use the media endpoint
references in this folder for the newsletter image pipeline.

Covered references:

- `get-files-folders-endpoint.md` (`GET /medias/files`)
- `ghl-upload-files-endpoint.md` (`POST /medias/upload-file`)
- `ghl-update-media-files.md` (`PUT /medias/files/{id}`)
- `ghl-bulk-update-files-folder.md` (`PUT /medias/update-files`)
- `ghl-bulk-medias-delete.md` (`PUT /medias/delete-files`)

## Core Scope Contract

The agent is folder-scoped for newsletter assets only.

Allowed root folder:

```text
News Letter images
```

Hard rules:

- Resolve this folder first and cache its `folderId` for the run.
- If missing, create it through your existing folder-create implementation.
- Never update or delete any file unless `file.folderId === managedFolderId`.
- If scope cannot be proven, fail closed and do not mutate.

## Intended Position In Pipeline

This reference set supports the planned `ghl-services/ghl-media-usage` stage:

```text
normalized Pexels selections -> upload/resolve in GHL -> rich GHL image objects -> final render
```

## How To Use These References

### 1. Discovery and scope guard

Use `get-files-folders-endpoint.md` first in every run.

Agent behavior:

- Call `GET /medias/files` with `locationId`.
- Locate the folder named `News Letter images`.
- If multiple folders have similar names, require exact match and use the
  resolved `id`.
- For listing files in scope, pass `parentId=managedFolderId` when possible.
- Build an in-memory allowed set of file IDs from the scoped list.

### 2. Upload workflow

Use `ghl-upload-files-endpoint.md` for ingesting newsletter images.

Agent behavior:

- Prefer hosted upload when ingesting approved external image URLs.
- Use direct multipart upload only when file bytes are already local.
- Always include `locationId` and `folderId=managedFolderId`.
- Enforce size and type validation before upload.
- After upload, re-read with `GET /medias/files` to resolve canonical hosted
  GHL URLs and confirm folder placement.

### 3. Single-item update workflow

Use `ghl-update-media-files.md` for one file at a time.

Agent behavior:

- Before `PUT /medias/files/{id}`, verify the ID is in the scoped allowed set.
- Allowed mutations: rename and move within managed scope.
- Disallow cross-scope move operations.

### 4. Bulk update workflow

Use `ghl-bulk-update-files-folder.md` for multi-file rename or move.

Agent behavior:

- Validate every target ID belongs to `managedFolderId` before request build.
- Remove out-of-scope IDs from payload and log each skip.
- If validated set is empty, no-op and return safe summary.

### 5. Bulk delete workflow (weekly cleanup)

Use `ghl-bulk-medias-delete.md` for scoped cleanup only.

Agent behavior:

- This endpoint is soft-delete/trash; still treat as destructive.
- Re-fetch scoped folder contents immediately before deletion.
- Intersect requested IDs with current scoped IDs.
- Delete only validated IDs through `PUT /medias/delete-files`.
- Never pass unfiltered account-wide IDs.

## High-Level Execution Plan

### Planned image handoff cycle

```text
1) Resolve managed folder (find or create)
2) Validate normalized image selections
3) Upload approved images into managed folder
4) Re-read scoped folder and confirm uploaded objects
5) Return rich GHL image objects for final render
```

### Weekly stats maintenance cycle

```text
1) Start stats-checking session
2) Resolve managed folder ID
3) List scoped files
4) Select stale files by policy
5) Bulk delete validated scoped IDs only
6) Upload new cycle images
7) Re-list and log final state
```

## Endpoint Order Of Operations

Preferred order:

```text
GET /medias/files
-> POST /medias/upload-file (optional)
-> PUT /medias/files/{id} or PUT /medias/update-files (optional)
-> PUT /medias/delete-files (weekly or explicit scoped cleanup)
-> GET /medias/files (post-operation verification)
```

Never do this:

```text
GET account-wide files
-> assume ownership
-> bulk delete by raw IDs
```

## Required Inputs and Headers

Per call requirements:

- `Authorization: Bearer <token>`
- `Version: 2021-07-28`
- `locationId` for query/body where required
- `medias.readonly` for list operations
- `medias.write` for upload/update/delete operations

## Output Contract Direction

The intended downstream output from the planned media stage is not just generic
file URLs. It should be rich render-ready GHL image objects containing:

- slot name
- GHL hosted URL
- GHL media/file id
- alt text
- attribution metadata
- retained provider metadata needed by final render

## Validation and Safety Gates

Before upload:

- Validate source trust, file type, and size.
- Ensure managed folder is resolved.

Before update or delete:

- Confirm folder ID is resolved.
- Confirm target IDs are members of current scoped set.
- Reject any operation with ambiguous or missing scope proof.

## Logging Contract

Each run should log at minimum:

- `locationId`
- `managedFolderId`
- `filesFoundInScope`
- `uploadedCount`
- `updatedCount`
- `deletedCount`
- `skippedOutOfScopeIds`
- `errors`

## Error Handling Policy

- `401`: fail fast, refresh or correct auth.
- `403`: scope/permission issue; do not retry blindly.
- `404`: treat ID or folder mismatch as potential scope drift.
- `429`: retry with backoff for read/upload; be conservative for mutations.
- `5xx`: retry idempotent-safe calls, then surface failure.

Mutation endpoints must fail closed if scope checks cannot complete.

## Naming Guidance

Recommended uploaded filename convention:

```text
newsletter-{topic}-{yyyy-mm-dd}-{index}
```

Example:

```text
newsletter-housing-2026-03-20-01
```

## Summary

This reference folder should be used as an execution contract for a
folder-scoped newsletter media agent that resolves render-ready GHL image
objects safely. Safety is higher priority than speed.
