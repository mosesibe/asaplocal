/**
 * Redesign Studio AI — Qwen-backed vision + image editing.
 *
 * Two different Qwen APIs are involved, deliberately:
 *   - Vision (reading the customer's photo) is OpenAI-compatible, so it uses
 *     the same `openai` SDK shape as ai.ts does for DeepSeek — only the base
 *     URL and model change.
 *   - Image editing is NOT on that endpoint. It uses DashScope's native
 *     multimodal-generation API, which takes 1-3 source images plus an
 *     instruction and returns edited images synchronously.
 *
 * Only the international endpoint is used. The China-region host rejects
 * these keys, and sending UK customers' interior photos to a China-region
 * service would be a materially different GDPR position.
 *
 * Like ai.ts, every function degrades gracefully when QWEN_API_KEY is absent
 * so local dev and CI never hard-fail.
 */
import OpenAI from "openai";

const QWEN_HOST = "https://dashscope-intl.aliyuncs.com";
const VISION_MODEL = process.env.QWEN_VISION_MODEL ?? "qwen-vl-max";
const EDIT_MODEL = process.env.QWEN_IMAGE_EDIT_MODEL ?? "qwen-image-edit";

// Rough per-call costs, used only to populate DesignStudioSession.aiCostPence
// so unit economics are measured rather than projected. Not billing-accurate.
const VISION_COST_PENCE = 1;
const EDIT_COST_PENCE = 3;

const qwen = process.env.QWEN_API_KEY
  ? new OpenAI({ apiKey: process.env.QWEN_API_KEY, baseURL: `${QWEN_HOST}/compatible-mode/v1` })
  : null;

export function isStudioConfigured(): boolean {
  return !!process.env.QWEN_API_KEY;
}

export type SpaceType =
  | "KITCHEN" | "BATHROOM" | "BEDROOM" | "LIVING_ROOM" | "DINING_ROOM"
  | "LOFT" | "BASEMENT" | "GARAGE" | "HALLWAY" | "HOME_OFFICE"
  | "GARDEN" | "OUTDOOR_OTHER" | "COMMERCIAL" | "OTHER";

const SPACE_TYPES = new Set<string>([
  "KITCHEN", "BATHROOM", "BEDROOM", "LIVING_ROOM", "DINING_ROOM",
  "LOFT", "BASEMENT", "GARAGE", "HALLWAY", "HOME_OFFICE",
  "GARDEN", "OUTDOOR_OTHER", "COMMERCIAL", "OTHER",
]);

export interface StyleProposal {
  /** Stable slug used as the concept's identifier, e.g. "warm-minimal". */
  key: string;
  /** Short human label shown on the concept card, e.g. "Warm minimal". */
  label: string;
  /** One-line description of the look, shown under the label. */
  blurb: string;
  /** The instruction handed to the image editor. */
  editPrompt: string;
  /** Plain-English list of the work this implies, shown to the customer and carried into the job description. */
  scope: string[];
  costMinPence: number;
  costMaxPence: number;
  durationDays: number;
}

export interface SpaceAnalysis {
  spaceType: SpaceType;
  /** What the model sees now — used in the job description as "current state". */
  summary: string;
  /** True when the work implied is beyond a cosmetic refresh (structural, gas, electrical mains). */
  needsSpecialist: boolean;
  styles: StyleProposal[];
}

/** Models sometimes wrap JSON in markdown fences despite instructions — strip them before parsing. */
function parseJsonLoose<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Last resort: pull the outermost {...} out of surrounding prose.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

const ANALYSIS_SYSTEM = `You are a UK interior and exterior design assistant for a home-services marketplace. You look at a photograph of a real space a homeowner wants to change, and propose three distinct redesign directions.

Rules:
- Identify the space from this exact list: KITCHEN, BATHROOM, BEDROOM, LIVING_ROOM, DINING_ROOM, LOFT, BASEMENT, GARAGE, HALLWAY, HOME_OFFICE, GARDEN, OUTDOOR_OTHER, COMMERCIAL, OTHER.
- Propose exactly three styles that genuinely suit THIS space. Never reuse generic labels that do not fit — "cottage garden" is meaningless for a loft, "open plan" is meaningless for a bathroom.
- "editPrompt" is an instruction to an image editor. It MUST tell the editor to keep the room's existing geometry, proportions, window and door positions, and camera angle, and to change only surfaces, fittings, furniture, colour and lighting. Never ask it to move walls or change the viewpoint. Never include people.
- "scope" lists the real trade work implied, in plain English a homeowner understands. 3-6 short items.
- "durationDays" is realistic working days on site for the whole project.
- Costs are realistic UK prices in GBP PENCE for the WHOLE project, including both labour and materials, as a wide band.

Costing rules — follow all of them:
- UK trade labour costs 20,000-35,000 pence per person per day. The project cannot cost less than durationDays x 20,000 pence, plus materials. Check this before answering: if a job takes 10 days it cannot cost 80,000 pence.
- Typical UK totals for reference: redecorating one room 40,000-150,000; fitted wardrobes or a breakfast nook in joinery 150,000-450,000; new bathroom fitted 500,000-1,200,000; full kitchen refit 800,000-2,500,000; loft conversion 3,000,000-7,500,000; single-storey extension 4,000,000-9,000,000; garden redesign with hard landscaping 500,000-2,500,000.
- Under-quoting is the single worst failure here. A homeowner who is quoted realistically walks away informed; one who is under-quoted feels misled and blames the platform. When uncertain, quote higher.
- Give costMaxPence at least 40% above costMinPence. Never give a narrow band.
- Set needsSpecialist true if the work plausibly involves structural change, gas, mains electrical rewiring, or building regulations.

Respond as JSON only, no prose:
{"spaceType": string, "summary": string, "needsSpecialist": boolean, "styles": [{"key": string, "label": string, "blurb": string, "editPrompt": string, "scope": string[], "costMinPence": number, "costMaxPence": number, "durationDays": number}]}`;

/**
 * Single vision pass over the hero photo: classifies the space and proposes
 * three space-appropriate directions with scope, cost band and duration.
 * Returns null when AI isn't configured or the call fails, so callers can fall
 * back rather than surfacing a broken studio.
 */
export async function analyseSpace(heroPhotoUrl: string, briefText?: string): Promise<SpaceAnalysis | null> {
  if (!qwen) return null;
  try {
    const completion = await qwen.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: heroPhotoUrl } },
            {
              type: "text",
              text: briefText?.trim()
                ? `What the homeowner wants: "${briefText.trim()}"`
                : "The homeowner hasn't described what they want — propose three directions you think suit this space.",
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = parseJsonLoose<SpaceAnalysis>(raw);
    if (!parsed || !Array.isArray(parsed.styles) || parsed.styles.length === 0) return null;

    return {
      spaceType: SPACE_TYPES.has(parsed.spaceType) ? parsed.spaceType : "OTHER",
      summary: String(parsed.summary ?? "").slice(0, 1000),
      needsSpecialist: !!parsed.needsSpecialist,
      styles: parsed.styles.slice(0, 3).map(normaliseStyle),
    };
  } catch (err) {
    console.error("[ai-images] analyseSpace failed", err);
    return null;
  }
}

/**
 * Lowest plausible UK cost for a single tradesperson-day, in pence. Used as a
 * floor rather than an estimate — it is what one person costs before any
 * materials.
 */
const MIN_LABOUR_PENCE_PER_DAY = 20_000;

/**
 * Defends against the model returning nonsense numbers or an inverted band.
 *
 * The labour floor matters as much as the prompt does: models consistently
 * under-price trade work, and the estimate flows into the job's budget, which
 * sets the lead price. An under-quote therefore both misleads the customer and
 * sells the lead too cheaply, so it is corrected here rather than trusted.
 */
function normaliseStyle(s: StyleProposal, i: number): StyleProposal {
  const durationDays = Math.min(365, Math.max(1, Math.round(Number(s.durationDays) || 1)));
  const floor = durationDays * MIN_LABOUR_PENCE_PER_DAY;

  const min = Math.max(floor, Math.round(Number(s.costMinPence) || 0));
  const max = Math.max(min, Math.round(Number(s.costMaxPence) || 0));

  return {
    key: String(s.key || `style-${i + 1}`).slice(0, 40),
    label: String(s.label || `Concept ${i + 1}`).slice(0, 60),
    blurb: String(s.blurb ?? "").slice(0, 200),
    editPrompt: String(s.editPrompt ?? "").slice(0, 1500),
    scope: Array.isArray(s.scope) ? s.scope.map((x) => String(x).slice(0, 160)).slice(0, 8) : [],
    costMinPence: min,
    // Keep the band genuinely wide — a narrow estimate reads as a quote.
    costMaxPence: Math.max(max, Math.round(min * 1.4)),
    durationDays,
  };
}

/** Appended to every edit instruction — the geometry guardrails matter more than the style. */
const EDIT_GUARDRAILS =
  " Preserve the exact room geometry, proportions, window and door positions, ceiling height and camera viewpoint of the original photograph. Photorealistic interior photography. Do not include any people, pets, text or watermarks.";

/**
 * Renders one concept from the customer's photo. Returns the generated image
 * URL, which is hosted by the provider and expires — callers must copy it into
 * our own storage before persisting.
 */
export async function generateConcept(heroPhotoUrl: string, editPrompt: string): Promise<string | null> {
  if (!process.env.QWEN_API_KEY) return null;
  try {
    const res = await fetch(`${QWEN_HOST}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EDIT_MODEL,
        input: {
          messages: [
            {
              role: "user",
              content: [{ image: heroPhotoUrl }, { text: editPrompt + EDIT_GUARDRAILS }],
            },
          ],
        },
        parameters: { n: 1, watermark: false },
      }),
    });

    if (!res.ok) {
      console.error("[ai-images] generateConcept HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const url = data?.output?.choices?.[0]?.message?.content?.find((c: { image?: string }) => c.image)?.image;
    return typeof url === "string" ? url : null;
  } catch (err) {
    console.error("[ai-images] generateConcept failed", err);
    return null;
  }
}

/**
 * Best-guess category slug for each space. Only a default — the customer can
 * change it on the job form before posting.
 *
 * Rooms map to decorating rather than building work, because most room
 * refreshes genuinely are cosmetic; anything the vision pass flags as
 * needing a specialist is escalated to Builders instead (see
 * categorySlugForSpace).
 */
const SPACE_CATEGORY_SLUG: Record<SpaceType, string> = {
  KITCHEN: "kitchen-fitting",
  BATHROOM: "bathroom-fitting",
  LOFT: "loft-conversion",
  GARAGE: "garage-conversion",
  BASEMENT: "builders",
  GARDEN: "garden-design-landscaping",
  OUTDOOR_OTHER: "garden-design-landscaping",
  BEDROOM: "interior-painting",
  LIVING_ROOM: "interior-painting",
  DINING_ROOM: "interior-painting",
  HALLWAY: "interior-painting",
  HOME_OFFICE: "interior-painting",
  COMMERCIAL: "builders",
  OTHER: "builders",
};

/** Resolves the category a redesign of this space should be posted under. */
export function categorySlugForSpace(spaceType: SpaceType, needsSpecialist: boolean): string {
  if (needsSpecialist) {
    const mapped = SPACE_CATEGORY_SLUG[spaceType];
    // Already a building trade — keep the more specific one.
    return mapped === "interior-painting" ? "builders" : mapped;
  }
  return SPACE_CATEGORY_SLUG[spaceType] ?? "builders";
}

export interface GeneratedConcept extends StyleProposal {
  /** Null when this particular render failed — the other concepts still stand. */
  url: string | null;
}

/**
 * Renders every proposed style in parallel. A failed render yields a concept
 * with url:null rather than failing the whole session, so the customer still
 * sees the concepts that did work.
 */
export async function generateConcepts(
  heroPhotoUrl: string,
  styles: StyleProposal[]
): Promise<{ concepts: GeneratedConcept[]; aiCostPence: number }> {
  const results = await Promise.all(
    styles.map(async (style) => ({ ...style, url: await generateConcept(heroPhotoUrl, style.editPrompt) }))
  );
  const succeeded = results.filter((r) => r.url).length;
  return {
    concepts: results,
    aiCostPence: VISION_COST_PENCE + succeeded * EDIT_COST_PENCE,
  };
}
