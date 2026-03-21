import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {z} from 'zod';

const htmlFragmentSchema = z.object({
  slotId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  html: z.string().trim().min(1),
  sourceLabel: z.string().trim().min(1).optional(),
});

const researchInputSchema = z.object({
  topic: z.string().trim().min(1),
  summary: z.string().trim().min(1).optional(),
  sourceLabel: z.string().trim().min(1).optional(),
  fragments: z.array(htmlFragmentSchema).optional(),
  sections: z
    .array(
      z.object({
        slotId: z.string().trim().min(1).optional(),
        heading: z.string().trim().min(1).optional(),
        bodyHtml: z.string().trim().min(1),
        sourceLabel: z.string().trim().min(1).optional(),
      }),
    )
    .optional(),
});

export interface ResearchContentFragment {
  slotId: string;
  order: number;
  html: string;
  source: {
    topic: string;
    sourceLabel: string | null;
  };
}

export interface ResearchContentResult {
  ok: boolean;
  topic: string;
  fragmentCount: number;
  contentFragments: ResearchContentFragment[];
  message: string;
}

function buildFragmentHtml(input: {
  title?: string;
  heading?: string;
  html?: string;
  bodyHtml?: string;
}): string {
  const heading = input.title ?? input.heading;
  const body = input.html ?? input.bodyHtml ?? '';
  if (!heading) {
    return body;
  }
  return `<section><h3>${heading}</h3>${body}</section>`;
}

export function buildResearchContent(raw: unknown): ResearchContentResult {
  const parsed = researchInputSchema.parse(raw);

  const entries =
    parsed.fragments?.map(fragment => ({
      slotId: fragment.slotId,
      html: buildFragmentHtml(fragment),
      sourceLabel: fragment.sourceLabel ?? parsed.sourceLabel ?? null,
    })) ??
    parsed.sections?.map(section => ({
      slotId: section.slotId,
      html: buildFragmentHtml(section),
      sourceLabel: section.sourceLabel ?? parsed.sourceLabel ?? null,
    })) ??
    [];

  if (entries.length === 0) {
    throw new Error('Research input must include fragments[] or sections[].');
  }

  return {
    ok: true,
    topic: parsed.topic,
    fragmentCount: entries.length,
    contentFragments: entries.map((entry, index) => ({
      slotId: entry.slotId ?? `section-${index + 1}`,
      order: index + 1,
      html: entry.html,
      source: {
        topic: parsed.topic,
        sourceLabel: entry.sourceLabel,
      },
    })),
    message: 'Research content normalized successfully.',
  };
}

export async function buildResearchContentFromFile(
  inputPath: string,
): Promise<ResearchContentResult> {
  const resolvedPath = resolve(process.cwd(), inputPath);
  const raw = JSON.parse(await readFile(resolvedPath, 'utf-8')) as unknown;
  return buildResearchContent(raw);
}
