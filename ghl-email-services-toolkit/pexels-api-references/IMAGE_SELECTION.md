# Image Selection

## Overview

This document defines how candidates returned by the Pexels search step should
be filtered, ranked, and selected for the two Mode 1 slots: `Hero` and
`Secondary`.

The target is one selected image per slot, with deterministic ranking and
editorial-quality bias.

## Selection Pipeline

```text
candidates -> filtering -> scoring -> ranking -> selected image
```

## Initial Filtering

Reject a candidate when any of the following is true:

- it is not suitable for landscape presentation
- required `src` fields are missing or unusable
- resolution is obviously too weak for newsletter rendering
- subject matter is clearly off-topic
- branding, text overlays, or visual clutter make it unusable

## Scoring Priorities

Ranking should prioritize:

1. Relevance to the story context
2. Editorial fit for a policy/business/newsletter tone
3. Composition quality for email layout
4. Orientation and render suitability
5. Color and exposure quality

Example scoring model:

```ts
score =
  relevance * 3 +
  editorialFit * 2 +
  composition * 2 +
  orientationFit * 2 +
  colorFit -
  duplicatePenalty;
```

The exact weights may evolve, but the ordering of priorities should remain
stable and explainable.

## Editorial Fit Guidance

Prefer:

- infrastructure
- buildings
- transit systems
- civic or real-world urban environments

Avoid:

- staged office scenes
- handshake or business-success concepts
- influencer or lifestyle imagery
- visuals that feel emotionally exaggerated for the topic

## Slot-Specific Expectations

### Hero

- broader context
- stronger visual anchor
- good wide composition
- representative of the lead story

### Secondary

- more topic-specific
- still strong, but less dominant than `Hero`
- useful at smaller or lower-priority placement

## Tie-Break Rules

If candidates tie on score, prefer the one with:

1. cleaner composition
2. stronger editorial fit
3. more neutral color/exposure
4. stable ordering by an explicit deterministic rule

Do not break ties randomly.

## Failure Behavior

If the candidate set is weak:

1. move to the next fallback query in the slot's query chain
2. gather a new candidate set
3. rerun filtering and ranking

If selection succeeds but normalization later fails for the chosen image:

1. reject that candidate
2. move to the next ranked candidate
3. fail only when no valid candidate remains

## Output Expectations

Selection should hand off enough data for normalization to produce:

- `pexelsUrl`
- dimensions
- attribution fields
- preferred source URL
- available variants

Selection is not the downstream contract boundary; normalization is.

## Summary

Selection in this folder is deterministic, editorially biased, and slot-aware.
Its job is to choose the best candidate; normalization then turns that choice
into the stable public contract.
