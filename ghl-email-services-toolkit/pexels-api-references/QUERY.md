# Pexels Query Strategy

## Overview

This document defines how story context should be converted into deterministic
Pexels search queries for Mode 1.

The goal is to retrieve editorially useful city, policy, and business imagery
without drifting into generic stock-photo results.

## Core Rules

- Build a query chain, not a single query.
- Keep the same input context producing the same query chain.
- Start specific, then broaden only when needed.
- Prefer real-world scenes over abstract keywords.
- Avoid keyword stuffing.

## Query Chain Shape

Each slot should produce between `2` and `4` queries:

1. Primary query: most specific to the story.
2. Fallback query 1: slightly broader wording.
3. Fallback query 2: broader category wording.
4. Optional fallback query 3: safe generic visual fallback.

The search flow should stop once a slot has a strong enough candidate set.

## NYC Context Guidance

When story context supports it, prefer terms such as:

- `new york city`
- `manhattan`
- `brooklyn`
- `nyc skyline`

If those terms reduce relevance or produce weak results, fallback queries may
drop the NYC qualifier.

## Slot Guidance

### Hero

Prefer broader context and visual reach:

- skyline
- infrastructure
- transit systems
- civic or large-scale urban scenes

### Secondary

Prefer closer topic alignment:

- buildings
- transit environments
- street-level city context
- topic-specific urban scenes

## Rejection Patterns

Avoid query wording that predictably produces:

- staged corporate stock scenes
- handshake or success-concept imagery
- smiling teams unrelated to the story
- abstract charts or overlays
- unrelated lifestyle imagery

Words to use carefully:

- `teamwork`
- `success`
- `business meeting`
- `happy people`

## Example Query Chains

Story: `NYC housing policy`

```text
new york city housing
apartment building city
urban residential buildings
city skyline apartments
```

Story: `MTA subway`

```text
new york city subway
subway station platform
urban transit system
```

Story: `congestion pricing policy`

```text
new york city traffic
city traffic congestion
urban traffic road
city street cars
```

## Operational Constraints

- maximum `4` queries per slot
- no random query generation
- no deep pagination as a substitute for better query design
- no broad account-wide search strategies outside slot context

## Summary

The query strategy in this folder is deterministic, bounded, and editorially
biased. Query quality should improve relevance before any selection logic is
asked to compensate.
