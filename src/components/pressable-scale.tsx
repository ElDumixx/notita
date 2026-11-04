import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { DURATION, EASE_OUT, RELEASE_SPRING } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Escala al pulsar (sutil por defecto). */
  scaleTo?: number;
};

/** Pressable con una leve compresión al pulsar (al tocar, no al soltar): respuesta táctil sin exagerar. */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      pressRetentionOffset={16}
      {...rest}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, { duration: DURATION.press, easing: EASE_OUT }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, RELEASE_SPRING));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
