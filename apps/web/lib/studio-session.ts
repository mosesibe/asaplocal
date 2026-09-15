/**
 * The customer-facing shape of a Redesign Studio session.
 *
 * Every session a customer runs is kept (nothing deletes them short of
 * deleting the account), so this is what their "My designs" history is built
 * from — shared by the studio API (web + mobile) and the web history pages.
 * Deliberately omits the raw `analysis`: its editPrompts are internal
 * instructions to the image model and never go to the client.
 */

/**
 * Rendering runs for at most 300s (generate/route.ts maxDuration). A session
 * still GENERATING well past that was interrupted — the request died — and is
 * safe to resume without paying for the same renders twice.
 */
const STALE_GENERATION_MS = 6 * 60 * 1000;

export interface StudioConceptView {
  key: string;
  label: string;
  blurb: string;
  scope: string[];
  costMinPence: number;
  costMaxPence: number;
  durationDays: number;
  /** Null when this render failed, or hasn't happened yet. */
  url: string | null;
}

export interface StudioSessionView {
  id: string;
  createdAt: string;
  status: string;
  spaceType: string;
  /** Human form of spaceType, e.g. "living room". */
  spaceLabel: string;
  heroPhotoUrl: string;
  sourcePhotos: string[];
  briefText: string | null;
  /** What the vision pass saw in the photo. */
  summary: string | null;
  needsSpecialist: boolean;
  concepts: StudioConceptView[];
  selectedIndex: number | null;
  job: { id: string; title: string; status: string } | null;
  /** Rendering was interrupted — opening the session should finish it. */
  canResume: boolean;
  /** Rendering may still be running in another request. */
  stillGenerating: boolean;
}

interface StudioSessionRow {
  id: string;
  createdAt: Date;
  status: string;
  spaceType: string;
  heroPhotoUrl: string;
  sourcePhotos: string[];
  briefText: string | null;
  analysis: unknown;
  concepts: unknown;
  selectedIndex: number | null;
  jobRequest?: { id: string; title: string; status: string } | null;
}

function toConcept(raw: unknown, i: number): StudioConceptView {
  const c = (raw ?? {}) as Record<string, unknown>;
  return {
    key: typeof c.key === "string" ? c.key : `concept-${i + 1}`,
    label: typeof c.label === "string" ? c.label : `Concept ${i + 1}`,
    blurb: typeof c.blurb === "string" ? c.blurb : "",
    scope: Array.isArray(c.scope) ? c.scope.filter((s): s is string => typeof s === "string") : [],
    costMinPence: Number(c.costMinPence) || 0,
    costMaxPence: Number(c.costMaxPence) || 0,
    durationDays: Number(c.durationDays) || 1,
    url: typeof c.url === "string" ? c.url : null,
  };
}

export function toStudioSessionView(row: StudioSessionRow, now = Date.now()): StudioSessionView {
  const analysis = (row.analysis ?? {}) as { summary?: unknown; needsSpecialist?: unknown; styles?: unknown };
  const rendered = Array.isArray(row.concepts) ? row.concepts : [];
  // Concepts are only written once rendering finishes. Before that — or if it
  // was interrupted — show the proposed styles (without images) so the
  // customer still sees what was suggested for their space.
  const source = rendered.length > 0 ? rendered : Array.isArray(analysis.styles) ? analysis.styles : [];
  const concepts = source.map((c, i) => toConcept(rendered.length > 0 ? c : { ...(c as object), url: null }, i));

  const inFlight = row.status === "GENERATING" || row.status === "ANALYSING";
  const stale = now - row.createdAt.getTime() > STALE_GENERATION_MS;

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    spaceType: row.spaceType,
    spaceLabel: row.spaceType.replace(/_/g, " ").toLowerCase(),
    heroPhotoUrl: row.heroPhotoUrl,
    sourcePhotos: row.sourcePhotos,
    briefText: row.briefText,
    summary: typeof analysis.summary === "string" && analysis.summary ? analysis.summary : null,
    needsSpecialist: !!analysis.needsSpecialist,
    concepts,
    selectedIndex: row.selectedIndex,
    job: row.jobRequest ? { id: row.jobRequest.id, title: row.jobRequest.title, status: row.jobRequest.status } : null,
    canResume: row.status === "GENERATING" && stale && concepts.length > 0,
    stillGenerating: inFlight && !stale,
  };
}

export function studioStatusLabel(view: Pick<StudioSessionView, "status" | "stillGenerating">): string {
  switch (view.status) {
    case "POSTED":
      return "Posted as a job";
    case "SELECTED":
      return "Design chosen";
    case "READY":
      return "Ready";
    case "FAILED":
      return "Couldn't create designs";
    default:
      return view.stillGenerating ? "Creating…" : "Didn't finish";
  }
}

export function studioDesignTitle(view: Pick<StudioSessionView, "spaceLabel">): string {
  const label = view.spaceLabel && view.spaceLabel !== "other" ? view.spaceLabel : "space";
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} redesign`;
}
