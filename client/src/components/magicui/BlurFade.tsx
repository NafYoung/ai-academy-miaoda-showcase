import React, { useRef } from 'react';
import {
  motion,
  useInView,
  useReducedMotion,
  type MotionProps,
  type UseInViewOptions,
  type Variants,
} from 'framer-motion';

type BlurFadeProps = Omit<MotionProps, 'children'> & {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  inView?: boolean;
  inViewMargin?: UseInViewOptions['margin'];
  blur?: string;
};

const BlurFade: React.FC<BlurFadeProps> = ({
  children,
  className,
  duration = 0.45,
  delay = 0,
  offset = 10,
  direction = 'up',
  inView = false,
  inViewMargin = '-50px',
  blur = '8px',
  ...props
}: BlurFadeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isVisibleInViewport: boolean = useInView(ref, {
    once: true,
    margin: inViewMargin,
  });
  const shouldReduceMotion: boolean | null = useReducedMotion();
  const shouldShow: boolean = !inView || isVisibleInViewport;
  const axis: 'x' | 'y' =
    direction === 'left' || direction === 'right' ? 'x' : 'y';
  const signedOffset: number =
    direction === 'right' || direction === 'down' ? -offset : offset;

  const variants: Variants = {
    hidden: {
      [axis]: shouldReduceMotion ? 0 : signedOffset,
      opacity: shouldReduceMotion ? 1 : 0,
      filter: shouldReduceMotion ? 'blur(0px)' : `blur(${blur})`,
    },
    visible: {
      [axis]: 0,
      opacity: 1,
      filter: 'blur(0px)',
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={shouldShow ? 'visible' : 'hidden'}
      variants={variants}
      transition={{ delay, duration, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export { BlurFade };
