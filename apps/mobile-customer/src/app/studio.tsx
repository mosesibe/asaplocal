import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Sparkles, Info, X, Check } from 'lucide-react-native';
import { Screen, Card, Text, Button, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
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
// POST /api/studio/sessions/{id}/generate (renders all 3 in parallel,
// server-side, up to ~300s). Both routes use the bearer-compatible auth() —
// already mobile-ready with no backend changes.
export default function StudioScreen() {
  const router = useRouter();
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

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to add photos.');
      return;
    }
    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: remainingSlots });
    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const urls = await Promise.all(result.assets.map((a) => uploadImage(a.uri, 'job-photo', a.mimeType ?? 'image/jpeg')));
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
    try {
      const session = await api.request<SessionResponse>('/api/studio/sessions', {
        method: 'POST',
        body: JSON.stringify({ sourcePhotos: photos, heroPhotoUrl: heroUrl, briefText: brief.trim() || undefined }),
      });
      setSessionId(session.id);
      setRemaining(session.remainingThisMonth);
      setConcepts(session.styles.map((s) => ({ ...s, url: null })));
      setStep('concepts');

      setBusy('rendering');
      const generated = await api.request<{ concepts: Concept[]; status: string }>(`/api/studio/sessions/${session.id}/generate`, {
        method: 'POST',
      });
      setConcepts(generated.concepts);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setError("You've used all your free designs this month. They reset on the 1st.");
        setStep('upload');
      } else {
        setError(e instanceof ApiError ? e.message : 'Something went wrong creating your designs.');
      }
    } finally {
      setBusy('idle');
    }
  }

  async function handleChoose(index: number) {
    const chosen = concepts[index];
    if (!sessionId || !chosen.url) return;
    setChoosing(index);
    try {
      await api.request(`/api/studio/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify({ selectedIndex: index }) });
      router.push({
        pathname: '/jobs/new',
        params: {
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
            <ConceptDisclaimer />

            {busy === 'rendering' && (
              <View style={styles.renderingRow}>
                <ActivityIndicator color={colors.brand[600]} />
                <Text variant="small" color="muted">
                  Creating your designs — this takes about 20 seconds.
                </Text>
              </View>
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
                    <Image source={{ uri: c.url }} style={styles.conceptImageFill} />
                  ) : busy === 'rendering' ? (
                    <ActivityIndicator color={colors.mutedForeground} />
                  ) : (
                    <Text variant="small" color="muted">
                      Couldn't create this one
                    </Text>
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
              <Pressable onPress={() => setStep('upload')}>
                <Text variant="small" color="brand">
                  ← Start over
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
  h1: { fontSize: 22, lineHeight: 28 },
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
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
});
