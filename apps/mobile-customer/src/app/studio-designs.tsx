import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Text, Badge, Button, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { formatDesignDate, studioDesignTitle, studioStatusLabel, type StudioSessionView } from '@/lib/studio';

// Ports apps/web/app/studio/designs/page.tsx: every Redesign Studio session
// the customer has run, newest first. Tapping one reopens it in studio.tsx.
export default function StudioDesignsScreen() {
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [designs, setDesigns] = useState<StudioSessionView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api
        .request<{ sessions: StudioSessionView[] }>('/api/studio/sessions')
        .then((res) => {
          if (cancelled) return;
          setDesigns(res.sessions);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) setError('Could not load your designs.');
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (!designs && !error) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.four, paddingBottom: bottomInset, gap: 12 }}>
        <Text variant="small" color="muted">
          Every Redesign Studio session you've run is kept here, so you can look back at the designs and get quotes whenever you're
          ready.
        </Text>

        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        {designs?.length === 0 && (
          <Card style={{ borderRadius: radius.xl, gap: 8 }}>
            <Text variant="bodyMedium">No designs yet</Text>
            <Text variant="small" color="muted">
              Photograph a room, loft or garden and see it redesigned.
            </Text>
            <Button onPress={() => router.push('/studio')}>Create your first design</Button>
          </Card>
        )}

        {designs?.map((design) => {
          const rendered = design.concepts.flatMap((c) => (c.url ? [c.url] : []));
          return (
            <Pressable
              key={design.id}
              onPress={() => router.push({ pathname: '/studio', params: { sessionId: design.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Open ${studioDesignTitle(design)} from ${formatDesignDate(design.createdAt)}`}
            >
              <Card style={{ borderRadius: radius.xl, gap: 8 }}>
                <Image
                  source={{ uri: rendered[0] ?? design.heroPhotoUrl }}
                  style={[styles.cover, { borderRadius: radius.lg, backgroundColor: colors.muted }]}
                />
                <View style={styles.titleRow}>
                  <Text variant="subtitle" style={styles.flex1}>
                    {studioDesignTitle(design)}
                  </Text>
                  <Badge variant={design.status === 'POSTED' ? 'success' : 'outline'}>{studioStatusLabel(design)}</Badge>
                </View>
                <Text variant="small" color="muted">
                  {formatDesignDate(design.createdAt)} · {rendered.length} design{rendered.length === 1 ? '' : 's'}
                </Text>
                {rendered.length > 1 && (
                  <View style={styles.thumbRow}>
                    {rendered.map((url) => (
                      <Image key={url} source={{ uri: url }} style={[styles.thumb, { borderRadius: radius.sm }]} />
                    ))}
                  </View>
                )}
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626' },
  cover: { width: '100%', aspectRatio: 4 / 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex1: { flex: 1 },
  thumbRow: { flexDirection: 'row', gap: 6 },
  thumb: { width: 56, height: 42 },
});
