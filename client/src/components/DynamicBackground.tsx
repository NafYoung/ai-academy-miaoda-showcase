import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { DotPattern } from '@/components/magicui';

const DynamicBackground: React.FC = () => {
  const shouldReduceMotion: boolean | null = useReducedMotion();

  return (
    <div className="academy-dynamic-background" aria-hidden="true">
      <motion.div
        className="academy-dynamic-background__mesh"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scale: [1, 1.04, 1],
                rotate: [0, 1.2, 0],
              }
        }
        transition={{ duration: 18, ease: 'easeInOut', repeat: Infinity }}
      />
      <DotPattern
        width={28}
        height={28}
        cr={0.8}
        className="academy-dynamic-background__dots"
      />
      <motion.div
        className="academy-dynamic-background__orb academy-dynamic-background__orb--blue"
        animate={
          shouldReduceMotion
            ? undefined
            : { x: [0, 80, 0], y: [0, 45, 0], scale: [1, 1.08, 1] }
        }
        transition={{ duration: 20, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="academy-dynamic-background__orb academy-dynamic-background__orb--violet"
        animate={
          shouldReduceMotion
            ? undefined
            : { x: [0, -70, 0], y: [0, 80, 0], scale: [1, 0.92, 1] }
        }
        transition={{ duration: 23, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="academy-dynamic-background__orb academy-dynamic-background__orb--cyan"
        animate={
          shouldReduceMotion
            ? undefined
            : { x: [0, 65, 0], y: [0, -55, 0], scale: [1, 1.1, 1] }
        }
        transition={{ duration: 25, ease: 'easeInOut', repeat: Infinity }}
      />
      <div className="academy-dynamic-background__veil" />
    </div>
  );
};

export default DynamicBackground;
