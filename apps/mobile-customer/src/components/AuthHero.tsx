import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@asaplocal/ui-native';

const HERO_HEIGHT = 320;

/**
 * Full-bleed photo hero shared by the login and register screens — Claude
 * Design variant "2c". Strips the device-mockup status bar (the real
 * device shows its own).
 */
export function AuthHero({ headline }: { headline: string }) {
  return (
    <View style={styles.hero}>
      <Image source={require('@/assets/images/hero.png')} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(32,30,29,.62)', 'rgba(32,30,29,.18)', 'rgba(245,234,216,.98)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <Image source={require('@/assets/images/splash-icon.png')} style={styles.mark} resizeMode="contain" />
          <Text style={styles.wordmark}>
            Asap<Text style={styles.wordmarkAccent}>Local</Text>
          </Text>
        </View>
        <Text style={styles.headline}>{headline}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: HERO_HEIGHT, overflow: 'hidden', backgroundColor: '#dcd3c4' },
  content: { ...StyleSheet.absoluteFill, paddingHorizontal: 26, paddingTop: 16, justifyContent: 'flex-end' },
  brandRow: { position: 'absolute', top: 22, left: 26, flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 30, height: 30 },
  // Matches HomeHeader.tsx's actual wordmark typography/color (Text
  // variant="title" -> Inter_700Bold, "Local" in colors.brand[500]) rather
  // than the Caprasimo display face used for the headline below — that
  // stays specific to this hero. #ff5a00 is BRAND_CUSTOMER[500] from
  // packages/ui-native/src/tokens.ts, hardcoded since it's the same value
  // regardless of light/dark scheme.
  wordmark: { fontFamily: 'Inter_700Bold', fontSize: 19, letterSpacing: -0.3, color: '#f9f4ed' },
  wordmarkAccent: { fontFamily: 'Inter_700Bold', color: '#ff5a00' },
  headline: { fontFamily: 'Caprasimo_400Regular', fontSize: 32, lineHeight: 36, color: '#fff9f2', maxWidth: 290, marginBottom: 72 },
});
