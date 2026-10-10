import React from 'react';
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from 'framer-motion';

import { cn } from '@/lib/utils';

interface AnimatedGradientTextProps extends Omit<HTMLMotionProps<'span'>, 'children'> {
  children: React.ReactNode;
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
}

const AnimatedGradientText: React.FC<AnimatedGradientTextProps> = ({
  children,
  className,
  speed = 1,
  colorFrom = '#4f6bff',
  colorTo = '#9c5bff',
  style,
  ...props
}: AnimatedGradientTextProps) => {
  const shouldReduceMotion: boolean | null = useReducedMotion();
  const duration: number = Math.max(2.8, 5 / Math.max(speed, 0.2));

  return (
    <motion.span
      className={cn('magic-gradient-text', className)}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colorFrom}, ${colorTo}, ${colorFrom})`,
        backgroundSize: '300% 100%',
        ...style,
      }}
      animate={
        shouldReduceMotion
          ? undefined
          : { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }
      }
      transition={{
        duration,
        ease: 'linear',
        repeat: Infinity,
      }}
      {...props}
    >
      {children}
    </motion.span>
  );
};

export { AnimatedGradientText };
