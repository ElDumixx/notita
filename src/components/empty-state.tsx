import { Text } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';
import { ANDROID, ENTER } from '@/theme/motion';
import { PASTELS } from '@/theme/palette';

// El pósit «respira»: sube un par de píxeles y vuelve, muy despacio (menos aún en Android).
const FLOAT = {
  animationName: {
    from: { transform: [{ translateY: 0 }, { rotate: '-5deg' }] },
    to: { transform: [{ translateY: ANDROID ? -2 : -3 }, { rotate: '-3.5deg' }] },
  },
  animationDuration: ANDROID ? '3.6s' : '3s',
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: 'ease-in-out',
} as const;

/** Pósit pequeño ilustrado + mensaje. Discreto, sin ruido. */
export function EmptyState({ title, message }: { title: string; message?: string }) {
  const theme = useTheme();
  const p = PASTELS.limon;
  const still = useReducedMotion();
  return (
    <Animated.View entering={ENTER} style={{ alignItems: 'center', paddingVertical: 36, gap: 14 }}>
      <Animated.View style={still ? { transform: [{ rotate: '-5deg' }] } : FLOAT}>
        <Svg width={84} height={84} viewBox="0 0 100 100">
          <Path d="M10 6 H90 Q94 6 94 10 V72 L72 94 H10 Q6 94 6 90 V10 Q6 6 10 6 Z" fill={p.paper} />
          <Path d="M72 94 L94 72 L74 72 Q72 72 72 74 Z" fill={p.fold} />
          <Path d="M28 50 L42 63 L70 35" stroke={p.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85} />
        </Svg>
      </Animated.View>
      <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text, textAlign: 'center' }}>{title}</Text>
      {message ? <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center', maxWidth: 260, lineHeight: 20 }}>{message}</Text> : null}
    </Animated.View>
  );
}
