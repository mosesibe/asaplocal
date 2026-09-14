import { prisma } from "@asaplocal/db";
import { categoriseJobRequest } from "./ai";
import { categorySlugForSpace, type SpaceType } from "./ai-images";

/** Below this the AI's pick is treated as a guess, and the space-type default wins. */
const MIN_AI_CONFIDENCE = 0.5;

/**
 * Picks the category a chosen Redesign Studio concept should be posted under.
 *
 * The space type alone is too coarse — a garden can mean a patio, a garden
 * room or a lawn, and each goes to a different trade — so the concept's own
 * scope is classified against every live category first. The static
 * space-type map is only the fallback when AI is unavailable or unsure.
 * Returns null only if no suitable category exists at all; the customer can
 * always change the pick on the job form.
 */
export async function resolveStudioCategoryId(input: {
  spaceType: SpaceType;
  needsSpecialist: boolean;
  briefText?: string | null;
  concept: { label: string; blurb: string; scope: string[] };
}): Promise<string | null> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
  });

  const description = [
    `Redesign of a ${input.spaceType.replace(/_/g, " ").toLowerCase()}.`,
    input.briefText?.trim() ? `Homeowner wants: ${input.briefText.trim()}` : null,
    `Style: ${input.concept.label} — ${input.concept.blurb}`,
    input.concept.scope.length ? `Work involved: ${input.concept.scope.join("; ")}` : null,
    input.needsSpecialist ? "The work may involve structural, gas or mains electrical changes." : null,
  ]
    .filter(Boolean)
    .join("\n");

  const ai = await categoriseJobRequest(description, categories).catch(() => null);
  if (ai?.categoryId && ai.confidence >= MIN_AI_CONFIDENCE) return ai.categoryId;

  const slug = categorySlugForSpace(input.spaceType, input.needsSpecialist);
  const fallback = categories.find((c) => c.slug === slug) ?? categories.find((c) => c.slug === "builders");
  return fallback?.id ?? null;
}
