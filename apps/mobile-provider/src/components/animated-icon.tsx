import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Ports apps/provider/components/splash-screen.tsx + its `asl-*` keyframes
// in apps/provider/app/globals.css 1:1 in spirit (same beats, same copy,
// same 2.4s runtime) — Reanimated shared values standing in for CSS
// `animation-delay`/`%`-keyframes, since RN has no timeline-keyframe
// primitive to mirror those directly. Figures are the design's, and they
// reconcile: 980 paid out + 260 available = 1,240 earned, at the
// platform's real 10% commission — see the web version's own comment.
const DURATION = 2400;
const pct = (p: number) => DURATION * (p / 100);

const CHART_BARS: { heightPct: number; delayPct: number }[] = [
  { heightPct: 42, delayPct: 4 },
  { heightPct: 58, delayPct: 6.4 },
  { heightPct: 50, delayPct: 8.8 },
  { heightPct: 74, delayPct: 11.2 },
  { heightPct: 66, delayPct: 13.6 },
  { heightPct: 100, delayPct: 16 },
];

const BG = '#0b1220';
const SURFACE = 'hsl(222, 40%, 10%)';
const BORDER = 'hsl(217, 33%, 20%)';
const FG = 'hsl(210, 20%, 98%)';
const MUTED = 'hsl(215, 20%, 65%)';
const BRAND = '#c15f2a';
const BRAND_300 = '#e6975d';

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

function ChartBar({ heightPct, delayPct }: { heightPct: number; delayPct: number }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(pct(delayPct), withTiming(1, { duration: pct(10), easing: Easing.out(Easing.back(1.2)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));

  return (
    <View style={styles.chartCol}>
      <Animated.View style={[styles.chartBar, { height: `${heightPct}%` }, style]} />
    </View>
  );
}

function RichSplashSequence({ onDone }: { onDone: () => void }) {
  const containerOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const promiseOpacity = useSharedValue(0);
  const promiseY = useSharedValue(14);
  const panelOpacity = useSharedValue(0);
  const panelY = useSharedValue(24);
  const panelScale = useSharedValue(0.97);
  const markOpacity = useSharedValue(0);
  const markScale = useSharedValue(0.72);
  const wordOpacity = useSharedValue(0);
  const wordY = useSharedValue(8);
  const ring1Opacity = useSharedValue(0);
  const ring1Scale = useSharedValue(0.6);
  const ring2Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.6);
  const barFillX = useSharedValue(0);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: pct(4), easing: EASE });
    containerOpacity.value = withDelay(
      pct(92),
      withTiming(0, { duration: pct(8), easing: EASE }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );

    glowOpacity.value = withDelay(pct(2), withTiming(0.6, { duration: pct(14), easing: Easing.inOut(Easing.ease) }));

    promiseOpacity.value = withSequence(
      withDelay(pct(4), withTiming(1, { duration: pct(8), easing: EASE })),
      withDelay(pct(42), withTiming(0, { duration: pct(6), easing: EASE }))
    );
    promiseY.value = withSequence(
      withDelay(pct(4), withTiming(0, { duration: pct(8), easing: EASE })),
      withDelay(pct(42), withTiming(-18, { duration: pct(6), easing: EASE }))
    );

    panelOpacity.value = withSequence(
      withDelay(pct(4), withTiming(1, { duration: pct(12), easing: EASE })),
      withDelay(pct(38), withTiming(0, { duration: pct(6), easing: EASE }))
    );
    panelY.value = withSequence(
      withDelay(pct(4), withTiming(0, { duration: pct(12), easing: EASE })),
      withDelay(pct(38), withTiming(-14, { duration: pct(6), easing: EASE }))
    );
    panelScale.value = withSequence(
      withDelay(pct(4), withTiming(1, { duration: pct(12), easing: EASE })),
      withDelay(pct(38), withTiming(0.98, { duration: pct(6), easing: EASE }))
    );

    markOpacity.value = withDelay(pct(60), withTiming(1, { duration: pct(10), easing: Easing.out(Easing.back(1.1)) }));
    markScale.value = withDelay(pct(60), withTiming(1, { duration: pct(10), easing: Easing.out(Easing.back(1.1)) }));

    wordOpacity.value = withDelay(pct(70), withTiming(1, { duration: pct(10), easing: Easing.out(Easing.ease) }));
    wordY.value = withDelay(pct(70), withTiming(0, { duration: pct(10), easing: Easing.out(Easing.ease) }));

    ring1Opacity.value = withDelay(pct(60), withSequence(withTiming(0.85, { duration: pct(10) }), withTiming(0, { duration: pct(18) })));
    ring1Scale.value = withDelay(pct(60), withTiming(1.9, { duration: pct(28), easing: Easing.out(Easing.ease) }));

    ring2Opacity.value = withDelay(
      pct(65.6),
      withSequence(withTiming(0.85, { duration: pct(10) }), withTiming(0, { duration: pct(18) }))
    );
    ring2Scale.value = withDelay(pct(65.6), withTiming(1.9, { duration: pct(28), easing: Easing.out(Easing.ease) }));

    barFillX.value = withTiming(1, { duration: pct(88), easing: EASE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const promiseStyle = useAnimatedStyle(() => ({ opacity: promiseOpacity.value, transform: [{ translateY: promiseY.value }] }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelY.value }, { scale: panelScale.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.value, transform: [{ scale: markScale.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: wordOpacity.value, transform: [{ translateY: wordY.value }] }));
  const ring1Style = useAnimatedStyle(() => ({ opacity: ring1Opacity.value, transform: [{ scale: ring1Scale.value }] }));
  const ring2Style = useAnimatedStyle(() => ({ opacity: ring2Opacity.value, transform: [{ scale: ring2Scale.value }] }));
  const barFillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: barFillX.value }] }));

  return (
    <Animated.View style={[styles.overlay, containerStyle]}>
      <Animated.View style={[styles.glow, glowStyle]} />

      <Animated.View style={[styles.promise, promiseStyle]}>
        <Text style={styles.promiseTitle}>Get paid, job by job</Text>
        <Text style={styles.promiseSub}>Commission out, payout in — every job accounted for.</Text>
      </Animated.View>

      <Animated.View style={[styles.panel, panelStyle]}>
        <Text style={styles.panelLabel}>Earned (after commission)</Text>
        <Text style={styles.total}>£1,240.00</Text>
        <Text style={styles.totalSub}>6 jobs completed this month</Text>

        <View style={styles.chart}>
          {CHART_BARS.map((bar, i) => (
            <ChartBar key={i} heightPct={bar.heightPct} delayPct={bar.delayPct} />
          ))}
        </View>

        <View style={styles.splits}>
          <View style={styles.split}>
            <Text style={styles.splitLabel}>Paid out</Text>
            <Text style={styles.splitValue}>£980.00</Text>
          </View>
          <View style={styles.split}>
            <Text style={styles.splitLabel}>Available</Text>
            <Text style={[styles.splitValue, styles.splitAccent]}>£260.00</Text>
          </View>
          <View style={styles.split}>
            <Text style={styles.splitLabel}>Commission</Text>
            <Text style={styles.splitValue}>10%</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.markWrap}>
        <View style={styles.markRings}>
          <Animated.View style={[styles.markRing, ring1Style]} />
          <Animated.View style={[styles.markRing, ring2Style]} />
        </View>
        <Animated.View style={markStyle}>
          <Image style={styles.mark} source={require('@/assets/images/splash-icon.png')} contentFit="contain" />
        </Animated.View>
        <Animated.View style={wordStyle}>
          <View style={styles.lockup}>
            <Text style={styles.wordmark}>
              Asap<Text style={styles.wordmarkAccent}>Local</Text>
            </Text>
            <Text style={styles.qualifier}>Business</Text>
          </View>
          <Text style={styles.tagline}>Win more local work</Text>
        </Animated.View>
      </View>

      <View style={styles.bar}>
        <Animated.View style={[styles.barFill, barFillStyle]} />
      </View>
    </Animated.View>
  );
}

export function AnimatedSplashOverlay() {
  const [phase, setPhase] = useState<'native' | 'rich' | 'done'>('native');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  if (phase === 'done') return null;

  if (phase === 'native') {
    return (
      <View
        onLayout={() => {
          SplashScreen.hideAsync().finally(() => {
            // Belt and braces: web's own splash never plays under reduced
            // motion either — the OS splash's static mark is the whole
            // "animation" there, so just hold it briefly and hand off.
            if (reduceMotion) {
              setTimeout(() => setPhase('done'), 500);
            } else {
              setPhase('rich');
            }
          });
        }}
        style={styles.overlay}
      >
        <Image style={styles.staticMark} source={require('@/assets/images/splash-icon.png')} contentFit="contain" />
      </View>
    );
  }

  return <RichSplashSequence onDone={() => setPhase('done')} />;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  staticMark: { width: 140, height: 120 },
  glow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: BRAND,
    opacity: 0,
  },
  promise: { position: 'absolute', top: '18%', paddingHorizontal: 28, alignItems: 'center' },
  promiseTitle: { fontFamily: 'Inter_700Bold', fontSize: 25, lineHeight: 31, color: FG, textAlign: 'center' },
  promiseSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 10 },
  panel: {
    position: 'absolute',
    top: '35%',
    left: 24,
    right: 24,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  panelLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: MUTED },
  total: { fontFamily: 'Inter_700Bold', fontSize: 32, color: FG, marginTop: 4 },
  totalSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: BRAND_300, marginTop: 4 },
  chart: { marginTop: 20, height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  chartCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 6, backgroundColor: BRAND_300 },
  splits: { marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, flexDirection: 'row', gap: 12 },
  split: { flex: 1 },
  splitLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: MUTED },
  splitValue: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: FG, marginTop: 3 },
  splitAccent: { color: BRAND_300 },
  markWrap: { alignItems: 'center' },
  markRings: { position: 'absolute', top: -2, width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  markRing: { position: 'absolute', width: 108, height: 108, borderRadius: 54, borderWidth: 2, borderColor: BRAND },
  mark: { width: 108, height: 108 },
  lockup: { marginTop: 22, flexDirection: 'row', alignItems: 'baseline', gap: 8, justifyContent: 'center' },
  wordmark: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.6, color: FG },
  wordmarkAccent: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.6, color: BRAND_300 },
  qualifier: { fontFamily: 'Inter_400Regular', fontSize: 14, color: MUTED },
  tagline: { fontFamily: 'Inter_400Regular', fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 8 },
  bar: {
    position: 'absolute',
    bottom: '11%',
    width: 108,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(226,232,240,0.14)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', width: '100%', borderRadius: 2, backgroundColor: BRAND, transformOrigin: 'left' },
});
