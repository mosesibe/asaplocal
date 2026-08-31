import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { Screen, Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  createdAt: string;
  providerResponse: string | null;
}

interface ReviewsData {
  reviewCount: number;
  reviews: Review[];
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color={colors.brand[600]}
          fill={n <= rating ? colors.brand[600] : 'transparent'}
        />
      ))}
    </View>
  );
}

// Ports apps/provider/app/reviews/page.tsx + respond-form.tsx. No StarRating
// component exists in @asaplocal/ui-native (web's lives in @asaplocal/ui,
// not shared with native), so this builds a small local star row instead.
export default function ReviewsScreen() {
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<ReviewsData>('/api/reviews');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitResponse = useCallback(
    async (reviewId: string) => {
      const text = drafts[reviewId]?.trim();
      if (!text) return;
      setSubmittingId(reviewId);
      setError(null);
      try {
        await api.request(`/api/reviews/${reviewId}/respond`, {
          method: 'POST',
          body: JSON.stringify({ response: text }),
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send response.');
      } finally {
        setSubmittingId(null);
      }
    },
    [drafts, load]
  );

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen style={styles.centered}>
        <Text variant="small" style={styles.errorText}>
          {error ?? 'Could not load reviews.'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.four }}>
        <Text variant="title">Reviews ({data.reviewCount})</Text>

        {error && (
          <Text variant="small" style={styles.errorText}>
            {error}
          </Text>
        )}

        {data.reviews.length === 0 ? (
          <Text variant="small" color="muted" style={styles.emptyText}>
            No reviews yet.
          </Text>
        ) : (
          data.reviews.map((r) => (
            <Card key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text variant="bodyMedium">{r.authorName}</Text>
                <StarRow rating={r.rating} />
              </View>
              <Text variant="caption" color="muted">
                {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              {r.comment && <Text variant="small">{r.comment}</Text>}

              {r.providerResponse ? (
                <View style={[styles.responseBox, { backgroundColor: colors.background, borderRadius: 12 }]}>
                  <Text variant="smallMedium">Your response</Text>
                  <Text variant="small" color="muted">
                    {r.providerResponse}
                  </Text>
                </View>
              ) : (
                <View style={styles.replyRow}>
                  <TextField
                    placeholder="Write a response…"
                    value={drafts[r.id] ?? ''}
                    onChangeText={(t) => setDrafts((d) => ({ ...d, [r.id]: t }))}
                    style={styles.replyInput}
                  />
                  <Button
                    size="sm"
                    onPress={() => submitResponse(r.id)}
                    loading={submittingId === r.id}
                    disabled={!drafts[r.id]?.trim()}
                  >
                    Reply
                  </Button>
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#dc2626', marginTop: 8 },
  emptyText: { marginTop: 16 },
  reviewCard: { marginTop: 16 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starRow: { flexDirection: 'row', gap: 2 },
  responseBox: { marginTop: 4, padding: 12, gap: 2 },
  replyRow: { marginTop: 8, gap: 8 },
  replyInput: {},
});
