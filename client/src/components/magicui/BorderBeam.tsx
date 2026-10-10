import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

interface BorderBeamProps {
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
  reverse?: boolean;
  className?: string;
}

interface BorderBeamStyle extends React.CSSProperties {
  '--magic-beam-from': string;
  '--magic-beam-to': string;
  '--magic-beam-width': string;
}

const BorderBeam: React.FC<BorderBeamProps> = ({
  duration = 8,
  delay = 0,
  colorFrom = '#4f6bff',
  colorTo = '#00d4b4',
  borderWidth = 1.5,
  reverse = false,
  className,
}: BorderBeamProps) => {
  const shouldReduceMotion: boolean | null = useReducedMotion();
  const beamStyle: BorderBeamStyle = {
    '--magic-beam-from': colorFrom,
    '--magic-beam-to': colorTo,
    '--magic-beam-width': `${borderWidth}px`,
  };

  return (
    <span
      aria-hidden="true"
      className={cn('magic-border-beam', className)}
      style={beamStyle}
    >
      <motion.span
        className="magic-border-beam__runner"
        animate={shouldReduceMotion ? undefined : { rotate: reverse ? -360 : 360 }}
        transition={{
          delay: -delay,
          duration,
          ease: 'linear',
          repeat: Infinity,
        }}
      />
    </span>
  );
};

export { BorderBeam };
