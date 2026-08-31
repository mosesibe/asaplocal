import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Screen, Text, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { HomeHeader } from '@/components/HomeHeader';
import { AiJobAssistantCard } from '@/components/AiJobAssistantCard';
import { AiBuddyCard } from '@/components/AiBuddyCard';
import { StudioTeaser } from '@/components/StudioTeaser';
import { PopularCategories, type CategorySummary } from '@/components/PopularCategories';
import { ServicesCarousel } from '@/components/ServicesCarousel';

type Mode = 'job' | 'buddy' | 'studio';

// Matches apps/web/components/homepage-ai-section.tsx's COPY map. Mode
// switching swaps content in place (matching web exactly) — it doesn't
// navigate anywhere; AI Buddy is fully inline, Studio shows its teaser
// inline (studio's actual upload/concepts flow is a separate page on web
// too, reached via the teaser's own button).
const COPY: Record<Mode, { title: string; subtitle: string }> = {
  job: { title: 'What do you need done?', subtitle: "Describe the job in your own words — we'll match you with vetted local pros ASAP." },
  buddy: { title: 'Not sure where to start?', subtitle: "Ask AI Buddy first — it's free, and it'll tell you if this is a DIY job or one for a pro." },
  studio: { title: 'See what your space could be', subtitle: 'Photograph a room, loft or garden and get redesign ideas — with realistic costs and timescales.' },
};

const MODES: { key: Mode; label: string }[] = [
  { key: 'job', label: 'Post a job' },
  { key: 'buddy', label: 'Ask AI Buddy' },
  { key: 'studio', label: 'Redesign a space' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [mode, setMode] = useState<Mode>('job');
  const [categories, setCategories] = useState<CategorySummary[]>([]);

  useEffect(() => {
    api
      .request<{ categories: CategorySummary[] }>('/api/categories')
      .then((res) => setCategories(res.categories.filter((c) => c.icon)))
      .catch(() => {});
  }, []);

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <HomeHeader />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          <ScrollView contentContainerStyle={{ paddingBottom: bottomInset }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.hero, { paddingHorizontal: spacing.four }]}>
              <Text variant="title" style={styles.heroTitle}>
                {COPY[mode].title}
              </Text>
              <Text variant="body" color="muted" style={styles.heroSubtitle}>
                {COPY[mode].subtitle}
              </Text>

              <View style={[styles.pillRow, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.full }]}>
                {MODES.map((m) => {
                  const active = mode === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setMode(m.key)}
                      style={[styles.pill, { borderRadius: radius.full, backgroundColor: active ? colors.brand[600] : 'transparent' }]}
                    >
                      <Text variant="smallMedium" color={active ? 'inverse' : 'muted'}>
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.assistant}>
                {mode === 'job' && <AiJobAssistantCard />}
                {mode === 'buddy' && <AiBuddyCard />}
                {mode === 'studio' && <StudioTeaser />}
              </View>

              {mode === 'job' && (
                <Pressable onPress={() => router.push('/search')} style={styles.browseLink}>
                  <Text variant="small" color="muted">
                    Prefer to look yourself?{' '}
                    <Text variant="smallMedium" color="brand">
                      Browse providers directly
                    </Text>
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={[styles.section, { paddingHorizontal: spacing.four }]}>
              <Text variant="subtitle" style={styles.sectionTitle}>
                Popular categories
              </Text>
              <PopularCategories categories={categories} />
            </View>

            <View style={styles.section}>
              <Text variant="subtitle" style={[styles.sectionTitle, { paddingHorizontal: spacing.four }]}>
                Explore services
              </Text>
              <ServicesCarousel categories={categories} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  hero: { paddingTop: 24, paddingBottom: 32 },
  heroTitle: { textAlign: 'center', fontSize: 28, lineHeight: 34 },
  heroSubtitle: { textAlign: 'center', marginTop: 10 },
  pillRow: { flexDirection: 'row', alignSelf: 'center', borderWidth: StyleSheet.hairlineWidth, padding: 4, marginTop: 20 },
  pill: { paddingHorizontal: 14, paddingVertical: 7 },
  assistant: { marginTop: 20 },
  browseLink: { marginTop: 14, alignItems: 'center' },
  section: { paddingTop: 8, paddingBottom: 24 },
  sectionTitle: { marginBottom: 16 },
});
