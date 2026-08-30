import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@asaplocal/ui-native';

import { CATEGORY_ICONS, CATEGORY_TAGLINES, CATEGORY_TAGLINE_FALLBACK, CAROUSEL_GRADIENTS } from '@/constants/categories';
import type { CategorySummary } from './PopularCategories';

// Matches apps/web/components/category-flyer-carousel.tsx: horizontally
// scrolling gradient cards, gradient cycled by index (not fixed per
// category), a large faint decorative icon behind a smaller solid one.
export function ServicesCarousel({ categories }: { categories: CategorySummary[] }) {
  const router = useRouter();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((c, i) => {
        const Icon = c.icon ? CATEGORY_ICONS[c.icon] : undefined;
        const [start, end] = CAROUSEL_GRADIENTS[i % CAROUSEL_GRADIENTS.length];
        const tagline = CATEGORY_TAGLINES[c.slug] ?? CATEGORY_TAGLINE_FALLBACK;
        return (
          <Pressable key={c.id} onPress={() => router.push(`/search?category=${c.slug}`)}>
            <LinearGradient colors={[start, end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
              {Icon && <Icon size={64} strokeWidth={1.5} color="rgba(255,255,255,0.15)" style={styles.decorativeIcon} />}
              {Icon && <Icon size={28} color="#ffffff" />}
              <View style={styles.textBlock}>
                <Text variant="subtitle" style={styles.title}>
                  {c.name}
                </Text>
                <Text variant="small" style={styles.tagline}>
                  {tagline}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 16, paddingHorizontal: 24, paddingVertical: 4 },
  card: {
    width: 256,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 160,
  },
  decorativeIcon: { position: 'absolute', top: -12, right: -12 },
  textBlock: { marginTop: 24 },
  title: { color: '#ffffff', fontWeight: '700' },
  tagline: { color: 'rgba(255,255,255,0.85)', marginTop: 4 },
});
