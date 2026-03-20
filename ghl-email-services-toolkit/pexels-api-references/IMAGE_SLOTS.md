# Image Slots

## Overview

Mode 1 supports exactly two image slots:

- `Hero`
- `Secondary`

These slot definitions are part of the public contract for this folder. They
should not be expanded casually because downstream consumers depend on the
two-slot structure.

## Slot Summary

| Slot | Purpose | Orientation | Preferred Source |
| --- | --- | --- | --- |
| `Hero` | Lead story visual | Landscape | `src.landscape` |
| `Secondary` | Supporting story visual | Landscape | `src.landscape` |

## Shared Rules

Both slots:

- require landscape-friendly imagery
- prefer `src.landscape`
- fall back to `src.large2x`, then `src.large`
- should be selected for editorial fit, not generic stock feel

Do not use `src.tiny`, `src.small`, or `src.medium` as final output sources.

## Hero

Purpose:

- primary visual anchor
- top-story support
- broad representation of the issue's lead story

Preferred qualities:

- skyline or city-wide context
- infrastructure
- transit systems
- strong wide composition

Avoid:

- visually noisy scenes
- overly staged business imagery
- images that become unclear when cropped wide

## Secondary

Purpose:

- second-story support
- visually important but lower-priority placement
- more specific topic alignment than `Hero`

Preferred qualities:

- buildings
- transit environments
- street-level city context
- policy-related urban scenes

Avoid:

- generic teamwork imagery
- fake meeting visuals
- abstract concept shots

## Constraints

- Mode 1 supports only these two slots.
- No tertiary, inline, gallery, or portrait-only slot types are defined here.
- Slot order is fixed: `Hero` then `Secondary`.

## Summary

The slot model stays intentionally small in Mode 1: two landscape-first,
editorial slots with the same source-variant priority and different content-fit
expectations.
