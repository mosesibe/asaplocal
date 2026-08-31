import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Card, Text, Button, useAppTheme } from '@asaplocal/ui-native';

import { useRequireAuth } from '@/lib/auth-guard';

const CHIPS = ['Kitchens', 'Lofts', 'Bathrooms', 'Gardens', 'Home offices'];

// Ports StudioTeaser from apps/web/components/homepage-ai-section.tsx —
// embedded inline on Home when "Redesign a space" is active, same as web.
// Unlike AI Buddy, Studio itself stays a separate screen on web too (this
// teaser just links to /studio), so tapping through here matches exactly.
export function StudioTeaser() {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { colors } = useAppTheme();

  return (
    <Card style={styles.card}>
      <Sparkles size={28} color={colors.brand[600]} style={styles.icon} />
      <Text variant="body" style={styles.body}>
        Take a photo of the space you want to change. We'll show you a few ways it could look, what the work typically costs,
        and how long it takes — then connect you with insured local pros.
      </Text>
      <View style={styles.chipRow}>
        {CHIPS.map((c, i) => (
          <Text key={c} variant="small" color="brand">
            {c}
            {i < CHIPS.length - 1 ? ' · ' : ''}
          </Text>
        ))}
      </View>
      <Button size="lg" onPress={() => requireAuth('/studio', () => router.push('/studio'))} style={styles.button}>
        Redesign a space — free
      </Button>
      <Text variant="caption" color="muted" style={styles.finePrint}>
        3 free designs a month
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: 24, gap: 8 },
  icon: { marginBottom: 4 },
  body: { textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  button: { alignSelf: 'stretch', marginTop: 8 },
  finePrint: {},
});
