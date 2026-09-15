import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Info, Maximize2, X } from 'lucide-react-native';
import { Screen, Card, Text, Button, Badge, ImageGallery, ImageLightbox, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
import { usePhotoPicker } from '@/lib/photo-picker';
import { formatDesignDate, studioStatusLabel, type StudioSessionView } from '@/lib/studio';
import { ApiError } from '@asaplocal/api-client';

const MAX_PHOTOS = 5;

interface StyleProposal {
  key: string;
  label: string;
  blurb: string;
  scope: string[];
  costMinPence: number;
  costMaxPence: number;
  durationDays: number;
}
interface Concept extends StyleProposal {
  url: string | null;
}
interface SessionResponse {
  id: string;
  spaceType: string;
  summary: string;
  needsSpecialist: boolean;
  styles: StyleProposal[];
  remainingThisMonth: number;
}

function money(pence: number): string {
  return `£${Math.round(pence / 100).toLocaleString('en-GB')}`;
}
function duration(days: number): string {
  if (days <= 1) return 'about a day';
  if (days < 10) return `${days} days`;
  return `${Math.round(days / 5)} week${Math.round(days / 5) === 1 ? '' : 's'}`;
}

type Step = 'upload' | 'concepts';
type Busy = 'idle' | 'analysing' | 'rendering';

// Ports apps/web/components/redesign-studio.tsx. Generation is two
// sequential blocking HTTP calls (not polling): POST /api/studio/sessions
// (vision analysis, returns 3 style proposals with no images yet), then
// POST /api/studio/sessions/{id}/generate (renders all 3 server-side, up to
// ~300s). Both routes use the bearer-compatible auth() — already mobile-ready
// with no backend changes.
//
// With a `sessionId` param (from studio-designs.tsx) it reopens a past
// session straight at its concepts, for review or to get quotes later.
export default function StudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [step, setStep] = useState<Step>('upload');
  const [photos, setPhotos] = useState<string[]>([]);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [brief, setBrief] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<Busy>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [choosing, setChoosing] = useState<number | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [reopened, setReopened] = useState<StudioSessionView | null>(null);
  const [loadingReopened, setLoadingReopened] = useState(!!params.sessionId);
  const { pick, sheet } = usePhotoPicker();
  // The full-screen viewer pages across every concept that rendered.
  const conceptUrls = concepts.flatMap((c) => (c.url ? [c.url] : []));
  const chosenIndex = reopened && (reopened.status === 'SELECTED' || reopened.status === 'POSTED') ? reopened.selectedIndex : null;

  const renderConcepts = useCallback(async (id: string) => {
    setError(null);
    setBusy('rendering');
    try {
      const generated = await api.request<{ concepts: Concept[]; status: string }>(`/api/studio/sessions/${id}/generate`, {
        method: 'POST',
      });
      setConcepts(generated.concepts);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong creating your designs.');
    } finally {
      setBusy('idle');
    }
  }, []);

  useEffect(() => {
    const id = params.sessionId;
    if (!id) return;
    let cancelled = false;
    setLoadingReopened(true);
    api
      .request<StudioSessionView>(`/api/studio/sessions/${id}`)
      .then((s) => {
        if (cancelled) return;
        setReopened(s);
        setSessionId(s.id);
        setPhotos(s.sourcePhotos);
        setHeroUrl(s.heroPhotoUrl);
        setBrief(s.briefText ?? '');
        setConcepts(s.concepts);
        setStep('concepts');
        // Rendering was interrupted — finish it rather than show a set of
        // designs with no images.
        if (s.canResume) void renderConcepts(s.id);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this design.');
      })
      .finally(() => {
        if (!cancelled) setLoadingReopened(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.sessionId, renderConcepts]);

  async function pickPhotos() {
    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) return;
    const assets = await pick({ quality: 0.8, allowsMultipleSelection: true, selectionLimit: remainingSlots });
    if (assets.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const urls = await Promise.all(assets.map((a) => uploadImage(a.uri, 'job-photo', a.mimeType ?? 'image/jpeg')));
      setPhotos((prev) => {
        const next = [...prev, ...urls].slice(0, MAX_PHOTOS);
        if (!heroUrl && next.length > 0) setHeroUrl(next[0]);
        return next;
      });
    } catch {
      setError('Could not upload one or more photos — please try again.');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
    if (heroUrl === url) setHeroUrl(null);
  }

  async function handleGenerate() {
    if (!heroUrl) return;
    setError(null);
    setBusy('analysing');
    let session: SessionResponse;
    try {
      session = await api.request<SessionResponse>('/api/studio/sessions', {
        method: 'POST',
        body: JSON.stringify({ sourcePhotos: photos, heroPhotoUrl: heroUrl, briefText: brief.trim() || undefined }),
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setError("You've used all your free designs this month. They reset on the 1st.");
      } else {
        setError(e instanceof ApiError ? e.message : 'Something went wrong creating your designs.');
      }
      setBusy('idle');
      return;
    }
    setReopened(null);
    setSessionId(session.id);
    setRemaining(session.remainingThisMonth);
    setConcepts(session.styles.map((s) => ({ ...s, url: null })));
    setStep('concepts');
    await renderConcepts(session.id);
  }

  async function handleChoose(index: number) {
    const chosen = concepts[index];
    if (!sessionId || !chosen.url) return;
    setChoosing(index);
    try {
      // The server resolves the category from the concept's scope, so the job
      // form arrives with it already selected.
      const { categoryId } = await api.request<{ categoryId: string | null }>(`/api/studio/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ selectedIndex: index }),
      });
      router.push({
        pathname: '/jobs/new',
        params: {
          ...(categoryId ? { categoryId } : {}),
          title: `${chosen.label} redesign`,
          description: [
            brief.trim() ? `Brief: ${brief.trim()}` : null,
            chosen.blurb,
            chosen.scope.length ? `Scope: ${chosen.scope.join(', ')}` : null,
            'Photos and an AI-generated concept image are attached — your pro will confirm exact scope after a visit.',
          ]
            .filter(Boolean)
            .join('\n\n'),
          budgetMinPence: String(chosen.costMinPence),
          budgetMaxPence: String(chosen.costMaxPence),
          photos: JSON.stringify(photos),
          designRenderUrl: chosen.url,
          designSessionId: sessionId,
        },
      });
    } catch {
      setError('Could not save your choice — please try again.');
    } finally {
      setChoosing(null);
    }
  }

  if (loadingReopened) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.four, paddingBottom: bottomInset, gap: 16 }}>
        {step === 'upload' ? (
          <>
            <Text variant="title" style={styles.h1}>
              See what your space could be
            </Text>
            <Text variant="small" color="muted">
              That awkward corner, the loft you only use for storage, a kitchen that needs rethinking — take a photo and see it
              redesigned, with a realistic idea of cost and timescale.
            </Text>

            <Pressable
              onPress={() => router.push('/studio-designs')}
              accessibilityRole="button"
              style={[styles.historyLink, { borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface }]}
            >
              <View style={styles.flex1}>
                <Text variant="smallMedium">My designs</Text>
                <Text variant="caption" color="muted">
                  Every design you've created, kept for you to look back on
                </Text>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </Pressable>

            <Card style={{ borderRadius: radius.xl, gap: 12 }}>
              <Text variant="bodyMedium">Photograph the space</Text>
              <Text variant="small" color="muted">
                Add up to {MAX_PHOTOS} photos. Then pick the one angle you want to see redesigned — we'll redesign that view and
                send the rest to your pro as reference.
              </Text>

              <View style={styles.photoGrid}>
                {photos.map((url) => {
                  const selected = heroUrl === url;
                  return (
                    <Pressable key={url} style={styles.photoItem} onPress={() => setHeroUrl(url)}>
                      <Image source={{ uri: url }} style={[styles.photoThumb, { borderRadius: radius.md, borderColor: selected ? colors.brand[600] : 'transparent' }]} />
                      <Pressable style={styles.removeBadge} onPress={() => removePhoto(url)}>
                        <X size={12} color="#fff" />
                      </Pressable>
                      {selected && (
                        <View style={[styles.selectedBadge, { backgroundColor: colors.brand[600] }]}>
                          <Text variant="caption" style={{ color: '#fff' }}>
                            Redesigning this
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {photos.length < MAX_PHOTOS && (
                <Button variant="outline" onPress={pickPhotos} loading={uploading}>
                  {photos.length === 0 ? 'Add photos' : 'Add another'}
                </Button>
              )}

              <Text variant="smallMedium" color="muted">
                Anything specific in mind? (optional)
              </Text>
              <TextInput
                value={brief}
                onChangeText={setBrief}
                placeholder="e.g. more storage, somewhere to work from home, brighter and easier to clean"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={500}
                style={[styles.briefInput, { borderColor: colors.border, borderRadius: radius.md, color: colors.foreground }]}
              />

              {error && (
                <Text variant="small" style={styles.error}>
                  {error}
                </Text>
              )}

              <Button onPress={handleGenerate} disabled={!heroUrl || busy !== 'idle' || uploading} loading={busy !== 'idle'} size="lg">
                {busy === 'analysing' ? 'Looking at your space…' : busy === 'rendering' ? 'Creating designs…' : 'Create designs'}
              </Button>
            </Card>
          </>
        ) : (
          <>
            {reopened && (
              <Card style={{ borderRadius: radius.xl, gap: 8 }}>
                <View style={styles.metaRow}>
                  <Text variant="small" color="muted">
                    Created {formatDesignDate(reopened.createdAt)}
                  </Text>
                  <Badge variant={reopened.status === 'POSTED' ? 'success' : 'outline'}>{studioStatusLabel(reopened)}</Badge>
                </View>
                {reopened.summary && (
                  <Text variant="small" color="muted">
                    {reopened.summary}
                  </Text>
                )}
                {reopened.sourcePhotos.length > 0 && (
                  <>
                    <Text variant="caption" color="muted" style={styles.sectionLabel}>
                      YOUR PHOTOS
                    </Text>
                    <ImageGallery images={reopened.sourcePhotos} thumbSize={64} />
                  </>
                )}
                {reopened.briefText && (
                  <>
                    <Text variant="caption" color="muted" style={styles.sectionLabel}>
                      WHAT YOU ASKED FOR
                    </Text>
                    <Text variant="small">{reopened.briefText}</Text>
                  </>
                )}
                {reopened.job && (
                  <Pressable onPress={() => router.push(`/jobs/${reopened.job!.id}`)} accessibilityRole="link">
                    <Text variant="small" color="brand">
                      Posted as a job: {reopened.job.title} →
                    </Text>
                  </Pressable>
                )}
              </Card>
            )}

            <ConceptDisclaimer />

            {busy === 'rendering' && (
              <View style={styles.renderingRow}>
                <ActivityIndicator color={colors.brand[600]} />
                <Text variant="small" color="muted">
                  Creating your designs — this takes about 20 seconds.
                </Text>
              </View>
            )}
            {busy === 'idle' && reopened?.stillGenerating && (
              <Text variant="small" color="muted" style={styles.centerText}>
                These designs are still being created — check back in a minute.
              </Text>
            )}

            {error && (
              <Text variant="small" style={styles.error}>
                {error}
              </Text>
            )}

            {concepts.map((c, i) => (
              <Card key={c.key} style={{ borderRadius: radius.xl, gap: 8 }}>
                <View style={[styles.conceptImage, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
                  {c.url ? (
                    <Pressable
                      style={styles.conceptImageFill}
                      onPress={() => setViewerIndex(conceptUrls.indexOf(c.url!))}
                      accessibilityRole="imagebutton"
                      accessibilityLabel={`View the ${c.label} design full screen`}
                    >
                      <Image source={{ uri: c.url }} style={styles.conceptImageFill} />
                      <View style={styles.expandBadge}>
                        <Maximize2 size={14} color="#fff" />
                      </View>
                    </Pressable>
                  ) : busy === 'rendering' ? (
                    <ActivityIndicator color={colors.mutedForeground} />
                  ) : (
                    <Text variant="small" color="muted">
                      {reopened?.stillGenerating ? 'Still being created…' : "Couldn't create this one"}
                    </Text>
                  )}
                  {chosenIndex === i && (
                    <View style={[styles.chosenBadge, { backgroundColor: colors.brand[600] }]}>
                      <Text variant="caption" style={{ color: '#fff' }}>
                        {reopened?.status === 'POSTED' ? 'Posted as a job' : 'You chose this'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant="subtitle">{c.label}</Text>
                <Text variant="small" color="muted">
                  {c.blurb}
                </Text>
                <View style={styles.metaRow}>
                  <Text variant="smallMedium">
                    {money(c.costMinPence)}–{money(c.costMaxPence)}
                  </Text>
                  <Text variant="small" color="muted">
                    {duration(c.durationDays)}
                  </Text>
                </View>
                {c.scope.slice(0, 4).map((s, si) => (
                  <Text key={si} variant="small" color="muted">
                    • {s}
                  </Text>
                ))}
                <Button onPress={() => handleChoose(i)} disabled={!c.url} loading={choosing === i}>
                  Get quotes for this
                </Button>
              </Card>
            ))}

            <View style={styles.footerRow}>
              <Pressable
                onPress={() => {
                  setReopened(null);
                  setStep('upload');
                }}
              >
                <Text variant="small" color="brand">
                  ← {reopened ? 'Try again with these photos' : 'Start over'}
                </Text>
              </Pressable>
              {remaining !== null && (
                <Text variant="small" color="muted">
                  {remaining} free design{remaining === 1 ? '' : 's'} left this month
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
      {sheet}
      <ImageLightbox images={conceptUrls} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </Screen>
  );
}

function ConceptDisclaimer() {
  const { colors, radius } = useAppTheme();
  const router = useRouter();
  return (
    <Card style={[styles.disclaimer, { borderRadius: radius.lg, backgroundColor: colors.muted }]}>
      <Info size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
      <Text variant="small" color="muted" style={styles.disclaimerText}>
        These are <Text variant="smallMedium">concepts, not quotes</Text>. Prices are typical ranges for work like this — your
        pro will confirm what's achievable in your space after a visit.{' '}
        <Text variant="smallMedium" color="brand" onPress={() => router.push('/search')}>
          Browse pros
        </Text>
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  flex1: { flex: 1 },
  h1: { fontSize: 22, lineHeight: 28 },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12 },
  sectionLabel: { letterSpacing: 0.5, marginTop: 4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoItem: { width: '31%', aspectRatio: 4 / 3 },
  photoThumb: { width: '100%', height: '100%', borderWidth: 2 },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: { position: 'absolute', bottom: 4, left: 4, right: 4, borderRadius: 6, paddingVertical: 2, alignItems: 'center' },
  briefInput: { borderWidth: StyleSheet.hairlineWidth, minHeight: 60, padding: 10, fontSize: 14, textAlignVertical: 'top' },
  error: { color: '#dc2626' },
  disclaimer: { flexDirection: 'row', gap: 8, padding: 12 },
  disclaimerText: { flex: 1 },
  renderingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  conceptImage: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  conceptImageFill: { width: '100%', height: '100%' },
  expandBadge: { position: 'absolute', bottom: 8, right: 8, padding: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.6)' },
  chosenBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
});
