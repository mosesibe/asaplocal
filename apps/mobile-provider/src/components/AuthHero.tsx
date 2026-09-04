import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Svg, { Rect, Path, G, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Text } from '@asaplocal/ui-native';

const HERO_HEIGHT = 290;

/**
 * Dark hero shared by the login and register screens — stylized live-jobs
 * map, illustrative only (no real geodata). Ports Claude Design variant
 * "1a"; strips the device-mockup status bar (the real device shows its
 * own).
 */
export function AuthHero() {
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0.75)).current;
  const pillY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.6, duration: 1820, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 1820, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.delay(780),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.75, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(pillY, { toValue: -6, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pillY, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulse.start();
    float.start();
    return () => {
      pulse.stop();
      float.stop();
    };
  }, [ringScale, ringOpacity, pillY]);

  return (
    <View style={styles.hero}>
      <Svg width="100%" height={HERO_HEIGHT} viewBox="0 0 390 290" style={StyleSheet.absoluteFill} preserveAspectRatio="xMidYMid slice">
        <Rect width={390} height={290} fill="#1b1a20" />
        <G stroke="#2b2a33" strokeWidth={16} strokeLinecap="round">
          <Path d="M-20 96 H410" />
          <Path d="M-20 210 H410" />
          <Path d="M96 -20 V310" />
          <Path d="M268 -20 V310" />
        </G>
        <G stroke="#232229" strokeWidth={7} strokeLinecap="round">
          <Path d="M-20 150 H410" />
          <Path d="M180 -20 V310" />
          <Path d="M340 -20 V310" />
          <Path d="M-20 258 H410" />
        </G>
        <G fill="#201f26">
          <Rect x={112} y={112} width={52} height={22} rx={6} />
          <Rect x={196} y={108} width={56} height={30} rx={6} />
          <Rect x={112} y={166} width={46} height={30} rx={6} />
          <Rect x={196} y={170} width={56} height={24} rx={6} />
          <Rect x={286} y={112} width={40} height={26} rx={6} />
          <Rect x={286} y={222} width={40} height={24} rx={6} />
          <Rect x={24} y={222} width={56} height={24} rx={6} />
        </G>
        <G fill="#7a8a5e" opacity={0.22}>
          <Circle cx={60} cy={60} r={44} />
          <Circle cx={352} cy={188} r={34} />
        </G>
        <Rect width={390} height={290} fill="url(#authHeroFade)" />
        <Defs>
          <LinearGradient id="authHeroFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#17161a" stopOpacity={0.35} />
            <Stop offset="0.55" stopColor="#17161a" stopOpacity={0} />
            <Stop offset="1" stopColor="#17161a" stopOpacity={0.95} />
          </LinearGradient>
        </Defs>
      </Svg>

      <View style={styles.brandRow}>
        <Image source={require('@/assets/images/splash-icon.png')} style={styles.mark} resizeMode="contain" />
        <Text style={styles.wordmark}>
          Asap<Text style={styles.wordmarkAccent}>Local</Text>
        </Text>
        <View style={styles.businessPill}>
          <Text style={styles.businessPillText}>Business</Text>
        </View>
      </View>

      <View pointerEvents="none" style={styles.pulseWrap}>
        <Animated.View style={[styles.pulseRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <View style={styles.pulseDot} />
      </View>
      <View pointerEvents="none" style={[styles.satelliteDot, { left: 78, top: 196 }]} />
      <View pointerEvents="none" style={[styles.satelliteDot, { left: 300, top: 158 }]} />

      <Animated.View style={[styles.floatPill, { transform: [{ translateY: pillY }] }]}>
        <View style={styles.floatPillDot} />
        <Text style={styles.floatPillText}>4 new jobs nearby</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: HERO_HEIGHT, overflow: 'hidden', backgroundColor: '#1b1a20' },
  brandRow: { position: 'absolute', left: 26, top: 22, flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 30, height: 30 },
  wordmark: { fontFamily: 'Caprasimo_400Regular', fontSize: 19, letterSpacing: -0.2, color: '#f9f4ed' },
  wordmarkAccent: { fontFamily: 'Caprasimo_400Regular', color: '#f6a06b' },
  businessPill: {
    borderWidth: 1,
    borderColor: 'rgba(143,160,115,.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  businessPillText: { fontFamily: 'Figtree_700Bold', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: '#8fa073' },
  pulseWrap: { position: 'absolute', left: 150, top: 118, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 56, height: 56, borderRadius: 999, backgroundColor: 'rgba(198,113,57,.5)' },
  pulseDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#c67139',
    borderWidth: 3,
    borderColor: '#f9f4ed',
    shadowColor: '#c67139',
    shadowOpacity: 0.9,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  satelliteDot: { position: 'absolute', width: 14, height: 14, borderRadius: 999, backgroundColor: '#8fa073', borderWidth: 2.5, borderColor: '#f9f4ed' },
  floatPill: {
    position: 'absolute',
    left: 106,
    top: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(23,22,26,.86)',
    borderWidth: 1,
    borderColor: 'rgba(249,244,237,.14)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  floatPillDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#8fa073' },
  floatPillText: { fontFamily: 'Figtree_600SemiBold', fontSize: 11.5, color: '#f9f4ed' },
});
