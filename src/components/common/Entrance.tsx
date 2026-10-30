import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface EntranceProps {
  children: ReactNode;
  /** Offset in ms, so a stack of cards cascades instead of arriving as one block. */
  delayMs?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * One shared entrance: rise 12px + fade over 320ms, staggered by `delayMs`.
 * Runs once on mount (not on every re-render), stands down under reduce-motion, and animates
 * opacity/transform only — never height or width — so nothing below it reflows mid-flight.
 */
export function Entrance({ children, delayMs = 0, style }: EntranceProps) {
  const reduced = useReducedMotion();
  // State, not a ref: the value is read during render (it drives opacity and translateY).
  const [progress] = useState(() => new Animated.Value(reduced ? 1 : 0));

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, delayMs]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
