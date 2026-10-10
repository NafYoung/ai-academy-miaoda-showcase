import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

interface ShimmerButtonProps
  extends React.ComponentPropsWithoutRef<'button'> {
  shimmerColor?: string;
  shimmerDuration?: number;
  borderRadius?: string;
  background?: string;
}

interface ShimmerButtonStyle extends React.CSSProperties {
  '--magic-shimmer-color': string;
  '--magic-shimmer-radius': string;
  '--magic-shimmer-background': string;
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#ffffff',
      shimmerDuration = 3.2,
      borderRadius = '999px',
      background = 'linear-gradient(115deg, #101a3d, #4f6bff)',
      className,
      children,
      style,
      type = 'button',
      ...props
    }: ShimmerButtonProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) => {
    const shouldReduceMotion: boolean | null = useReducedMotion();
    const buttonStyle: ShimmerButtonStyle = {
      '--magic-shimmer-color': shimmerColor,
      '--magic-shimmer-radius': borderRadius,
      '--magic-shimmer-background': background,
    };

    return (
      <button
        ref={ref}
        type={type}
        data-ai-section-type="button"
        className={cn('magic-shimmer-button', className)}
        style={{ ...buttonStyle, ...style }}
        {...props}
      >
        <motion.span
          aria-hidden="true"
          className="magic-shimmer-button__runner"
          animate={shouldReduceMotion ? undefined : { rotate: 360 }}
          transition={{
            duration: shimmerDuration,
            ease: 'linear',
            repeat: Infinity,
          }}
        />
        <span aria-hidden="true" className="magic-shimmer-button__surface" />
        <span className="magic-shimmer-button__content">{children}</span>
      </button>
    );
  },
);

ShimmerButton.displayName = 'ShimmerButton';

export { ShimmerButton };
