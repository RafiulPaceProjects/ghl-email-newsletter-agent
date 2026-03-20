# Image Normalization

## Overview

Normalization is the contract boundary between raw Pexels photo objects and the
internal image shape expected by downstream systems.

Nothing downstream of this step should depend on raw Pexels response objects.

## Input

Normalization operates on one selected Pexels photo object returned from:

```http
GET /v1/search
```

## Output Contract

```ts
export type NormalizedImage = {
  id: number;
  pexelsUrl: string;
  width: number;
  height: number;
  alt: string;
  avgColor?: string;
  photographer: {
    name: string;
    url: string;
  };
  source: {
    preferred: string;
    fallback: string[];
  };
  variants: {
    landscape?: string;
    large?: string;
    large2x?: string;
    original?: string;
  };
};
```

## Field Mapping

| Normalized field | Pexels field |
| --- | --- |
| `id` | `id` |
| `pexelsUrl` | `url` |
| `width` | `width` |
| `height` | `height` |
| `alt` | `alt` |
| `avgColor` | `avg_color` |
| `photographer.name` | `photographer` |
| `photographer.url` | `photographer_url` |
| `variants.landscape` | `src.landscape` |
| `variants.large` | `src.large` |
| `variants.large2x` | `src.large2x` |
| `variants.original` | `src.original` |

## Source Priority

Preferred source selection order:

1. `src.landscape`
2. `src.large2x`
3. `src.large`

Example:

```ts
const preferred =
  photo.src.landscape ||
  photo.src.large2x ||
  photo.src.large;

const fallback = [photo.src.large2x, photo.src.large].filter(Boolean);
```

## Required Fields

The normalized output must contain valid values for:

- `id`
- `pexelsUrl`
- `width`
- `height`
- `photographer.name`
- `photographer.url`
- `source.preferred`

If any required field is missing or invalid, reject the candidate.

## Optional Fields

Include when available:

- `alt`
- `avgColor`
- `variants.*`

## Alt Text Rules

1. Use `photo.alt` when present.
2. If missing, fall back to the query or topic context when available.
3. If neither exists, use `Editorial image`.

## Data Integrity Rules

- Never pass raw Pexels objects beyond this layer.
- Validate `src` before variant selection.
- Keep URLs as non-empty strings only.
- Do not include low-value variants that downstream systems should not use.

## Example

```json
{
  "id": 123,
  "pexelsUrl": "https://www.pexels.com/photo/...",
  "width": 4000,
  "height": 3000,
  "alt": "New York City skyline at sunset",
  "avgColor": "#8899AA",
  "photographer": {
    "name": "John Doe",
    "url": "https://www.pexels.com/@john"
  },
  "source": {
    "preferred": "https://images.pexels.com/...landscape.jpg",
    "fallback": [
      "https://images.pexels.com/...large2x.jpg",
      "https://images.pexels.com/...large.jpg"
    ]
  },
  "variants": {
    "landscape": "https://images.pexels.com/...landscape.jpg",
    "large": "https://images.pexels.com/...large.jpg",
    "large2x": "https://images.pexels.com/...large2x.jpg",
    "original": "https://images.pexels.com/...original.jpg"
  }
}
```

## Summary

Normalization is the mandatory contract boundary in this folder. It converts a
selected raw Pexels photo into the stable `NormalizedImage` shape that
downstream consumers can rely on safely.
