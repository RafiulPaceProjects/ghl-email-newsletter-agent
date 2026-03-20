# AGENT.md

## Purpose

Planned service boundary for upstream newsletter research content generation.

## Status

- Planned module only.
- No runtime implementation exists in this folder yet.

## Intended Position In Pipeline

```text
research-content -> inject-content final render
```

## Intended Inputs

- topic or story research context
- any upstream research artifacts or structured prompts used to generate
  newsletter content

## Intended Output

The documented target output is:

- ordered raw HTML fragments

These fragments are intended to be render inputs, not final publish-ready HTML
on their own.

## Intended Responsibilities

- Produce ordered raw HTML fragments for newsletter content sections.
- Keep content generation separate from image sourcing and template publish.
- Hand content downstream to `inject-content` for final assembly.

## Non-Responsibilities

- Do not upload or resolve images.
- Do not mutate GHL email templates.
- Do not own final Jinja render assembly.

## References

- `../ghl-update-template/inject-content/AGENT.md`
- `../../README.md`

## Routing Rule

- Route future "research to ordered newsletter content fragments" work to this
  folder.
