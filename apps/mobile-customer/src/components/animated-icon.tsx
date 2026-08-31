import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Ports apps/web/components/splash-screen.tsx's "radar sweep" launch splash
// (globals.css .asl-* rules) — one 2400ms timeline driven by a single shared
// "progress" value (0→1, linear), with every sub-animation's start/hold/end
// percentages taken straight from the CSS keyframes' own percentages via
// interpolate(), the same way the CSS timeline drives every rule off one
// animation-duration. Phase 1 (0–60%): lead copy + radar rings/sweep/pins.
// Phase 2 (60–100%): logo mark/wordmark/tagline handoff. A bottom progress
// bar fills throughout. The web version's conic-gradient sweep becomes an
// SVG pie-slice arc here — RN has no conic-gradient primitive — rotated via
// the same 0→720deg timing.
const DURATION = 2400;
const RADAR_SIZE = 220;
const RING_COLOR = 'rgba(255, 90, 0, 1)';
const PIN_POSITIONS = [
  { top: 42, left: 144, delay: 0.022 }, // 30deg
  { top: 151, left: 170, delay: 0.09 }, // 125deg
  { top: 173, left: 87, delay: 0.142 }, // 197deg
  { top: 97, left: 54, delay: 0.202 }, // 280deg
];

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(setVisible, false);
    });
  }, [animate, progress]);

  if (!visible) return null;

  if (!animate) {
    return (
      <View
        onLayout={() => {
          SplashScreen.hideAsync().finally(() => setAnimate(true));
        }}
        style={styles.overlay}
      />
    );
  }

  return (
    <SplashSequence progress={progress} />
  );
}

function SplashSequence({ progress }: { progress: SharedValue<number> }) {
  const outerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.04, 0.92, 1], [0, 1, 1, 0], 'clamp'),
    transform: [{ scale: interpolate(progress.value, [0, 0.92, 1], [1, 1, 1.04], 'clamp') }],
  }));

  const leadStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.04, 0.12, 0.54, 0.6], [0, 0, 1, 1, 0], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [0, 0.04, 0.12, 0.54, 0.6], [12, 12, 0, 0, -14], 'clamp') }],
  }));

  const radarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.04, 0.14, 0.54, 0.6], [0, 0, 1, 1, 0], 'clamp'),
    transform: [{ scale: interpolate(progress.value, [0, 0.04, 0.14, 0.6], [0.9, 0.9, 1, 1.06], 'clamp') }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 0.52, 1], [0, 720, 720], 'clamp')}deg` }],
  }));

  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 0.7], [0, 0, 1], 'clamp'),
    transform: [{ scale: interpolate(progress.value, [0, 0.6, 0.7], [0.74, 0.74, 1], 'clamp') }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.7, 0.8], [0, 0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [0, 0.7, 0.8], [8, 8, 0], 'clamp') }],
  }));

  const barFillStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 0.88, 1], [0, 100, 100], 'clamp')}%`,
  }));

  return (
    <Animated.View style={[styles.overlay, outerStyle]}>
      <Animated.View style={[styles.lead, leadStyle]}>
        <Text style={styles.leadTitle}>Vetted pros, right where you are</Text>
        <Text style={styles.leadSub}>Compare, message and book — near you.</Text>
      </Animated.View>

      <Animated.View style={[styles.radar, radarStyle]}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          <Circle cx={RADAR_SIZE / 2} cy={RADAR_SIZE / 2} r={44} stroke="rgba(255,90,0,0.3)" strokeWidth={1} fill="none" />
          <Circle cx={RADAR_SIZE / 2} cy={RADAR_SIZE / 2} r={76} stroke="rgba(255,90,0,0.2)" strokeWidth={1} fill="none" />
          <Circle cx={RADAR_SIZE / 2} cy={RADAR_SIZE / 2} r={108} stroke="rgba(255,90,0,0.12)" strokeWidth={1} fill="none" />
        </Svg>
        <Animated.View style={[styles.sweepWrap, sweepStyle]}>
          <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
            <Defs>
              <LinearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={RING_COLOR} stopOpacity={0.34} />
                <Stop offset="100%" stopColor={RING_COLOR} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={pieSlicePath(RADAR_SIZE / 2, RADAR_SIZE / 2, 108, 0, 58)} fill="url(#sweepGrad)" />
          </Svg>
        </Animated.View>
        {PIN_POSITIONS.map((p, i) => (
          <Pin key={i} progress={progress} top={p.top} left={p.left} delay={p.delay} />
        ))}
      </Animated.View>

      <Animated.View style={[styles.markWrap, markStyle]}>
        <Image style={styles.mark} source={require('@/assets/images/splash-icon.png')} contentFit="contain" />
        <Animated.View style={wordStyle}>
          <Text style={styles.wordmark}>
            Asap<Text style={styles.wordmarkAccent}>Local</Text>
          </Text>
          <Text style={styles.tagline}>Find trusted local service providers</Text>
        </Animated.View>
      </Animated.View>

      <View style={styles.bar}>
        <Animated.View style={[styles.barFill, barFillStyle]} />
      </View>
    </Animated.View>
  );
}

function Pin({ progress, top, left, delay }: { progress: SharedValue<number>; top: number; left: number; delay: number }) {
  const style = useAnimatedStyle(() => {
    // The pin's own pop cycle runs on the full 0–1 timeline, just phase-
    // shifted by `delay` — matching the CSS's animation-delay on an
    // animation whose own duration equals the parent's.
    const local = interpolate(progress.value, [delay, 1], [0, 1], 'clamp');
    return {
      opacity: interpolate(local, [0, 0.06, 0.34, 0.42], [0, 1, 1, 0], 'clamp'),
      transform: [{ scale: interpolate(local, [0, 0.06, 0.34, 0.42], [0.2, 1, 1, 0.4], 'clamp') }],
    };
  });
  return <Animated.View style={[styles.pin, { top, left }, style]} />;
}

// A pie-slice (annulus segment approximated as a full-radius wedge, masked
// visually by sitting behind the opaque rings) from `startDeg` sweeping
// `sweepDeg` degrees, matching the web version's conic-gradient sweep.
function pieSlicePath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): string {
  const toXY = (deg: number) => {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const start = toXY(startDeg);
  const end = toXY(startDeg + sweepDeg);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#090e1a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  lead: { position: 'absolute', top: '18%', left: 0, right: 0, paddingHorizontal: 40, alignItems: 'center' },
  leadTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 22, lineHeight: 27, color: '#f7f9fc', textAlign: 'center' },
  leadSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#94a3b8', marginTop: 10, textAlign: 'center' },
  radar: { position: 'absolute', top: '52%', left: '50%', marginLeft: -RADAR_SIZE / 2, marginTop: -RADAR_SIZE / 2, width: RADAR_SIZE, height: RADAR_SIZE },
  sweepWrap: { position: 'absolute', top: 0, left: 0 },
  pin: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff9f6b' },
  markWrap: { position: 'absolute', top: '50%', left: '50%', marginLeft: -80, marginTop: -60, width: 160, alignItems: 'center' },
  mark: { width: 88, height: 76 },
  wordmark: { fontFamily: 'Inter_700Bold', fontSize: 26, color: '#f7f9fc', marginTop: 16, textAlign: 'center' },
  wordmarkAccent: { color: '#ff9f6b' },
  tagline: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#94a3b8', marginTop: 6, textAlign: 'center' },
  bar: { position: 'absolute', bottom: '11%', left: '50%', marginLeft: -54, width: 108, height: 2, borderRadius: 2, backgroundColor: 'rgba(247,249,252,0.12)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, backgroundColor: '#ff5a00' },
});
