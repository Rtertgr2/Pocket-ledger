import { useState, type ReactNode } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far the surface dips on press. Small on purpose: the touch point must not move. */
  toScale?: number;
  children?: ReactNode;
}

// The style must land on the pressable itself, not an inner view: callers pass flex/absolute
// layout there, and an unstyled pressable shrinks to its content.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The shared press treatment: one 120ms ease-out dip, standing down under reduce-motion.
 * A jump to the pressed value would read as a glitch, so the value is animated rather than
 * set — the scale is what carries "pressed" instead of an opacity fade, so layout never shifts.
 */
export function PressableScale({ style, toScale = 0.98, children, ...rest }: PressableScaleProps) {
  // Held in state, not a ref: the value is read during render (it feeds the transform).
  const [scale] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();

  const animate = (toValue: number) => {
    if (reduced) return;
    Animated.timing(scale, { toValue, duration: 120, useNativeDriver: true }).start();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(event) => {
        animate(toScale);
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        rest.onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
