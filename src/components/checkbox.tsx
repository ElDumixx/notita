import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ANDROID, DURATION, EASE_OUT } from '@/theme/motion';

// Al marcar: se encoge un poco y vuelve; en iOS con un rebote breve, en Android sin él.
const SQUEEZE = ANDROID ? 0.9 : 0.86;
const SETTLE = ANDROID ? { duration: 200, dampingRatio: 1 } : { duration: 340, dampingRatio: 0.55 };

type Props = {
  checked: boolean;
  color: string;
  ring: string;
  onToggle: () => void;
  size?: number;
  label: string;
};

/** Casilla redonda: se rellena con el color de la libreta y responde con un pequeño latido. */
export function Checkbox({ checked, color, ring, onToggle, size = 24, label }: Props) {
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.set(withTiming(checked ? 1 : 0, { duration: DURATION.quick, easing: EASE_OUT }));
  }, [checked, progress]);

  const circle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], ['transparent', color]),
    borderColor: interpolateColor(progress.get(), [0, 1], [ring, color]),
    transform: [{ scale: scale.get() }],
  }));
  const mark = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ scale: 0.6 + progress.get() * 0.4 }] }));

  return (
    <Pressable
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => {
        scale.set(withSequence(withTiming(SQUEEZE, { duration: 90, easing: EASE_OUT }), withSpring(1, SETTLE)));
        onToggle();
      }}>
      <Animated.View
        style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.75, alignItems: 'center', justifyContent: 'center' }, circle]}>
        <Animated.View style={mark}>
          <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
            <Path d="M5 12.5l4.2 4.2L19 7" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
