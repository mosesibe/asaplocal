// Mirrors apps/web/lib/studio-session.ts — the shape GET /api/studio/sessions
// and GET /api/studio/sessions/:id return, plus the same display helpers.

export interface StudioConcept {
  key: string;
  label: string;
  blurb: string;
  scope: string[];
  costMinPence: number;
  costMaxPence: number;
  durationDays: number;
  url: string | null;
}

export interface StudioSessionView {
  id: string;
  createdAt: string;
  status: string;
  spaceType: string;
  spaceLabel: string;
  heroPhotoUrl: string;
  sourcePhotos: string[];
  briefText: string | null;
  summary: string | null;
  needsSpecialist: boolean;
  concepts: StudioConcept[];
  selectedIndex: number | null;
  job: { id: string; title: string; status: string } | null;
  /** Rendering was interrupted — opening the session should finish it. */
  canResume: boolean;
  /** Rendering may still be running in another request. */
  stillGenerating: boolean;
}

export function studioStatusLabel(view: Pick<StudioSessionView, 'status' | 'stillGenerating'>): string {
  switch (view.status) {
    case 'POSTED':
      return 'Posted as a job';
    case 'SELECTED':
      return 'Design chosen';
    case 'READY':
      return 'Ready';
    case 'FAILED':
      return "Couldn't create designs";
    default:
      return view.stillGenerating ? 'Creating…' : "Didn't finish";
  }
}

export function studioDesignTitle(view: Pick<StudioSessionView, 'spaceLabel'>): string {
  const label = view.spaceLabel && view.spaceLabel !== 'other' ? view.spaceLabel : 'space';
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} redesign`;
}

export function formatDesignDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
