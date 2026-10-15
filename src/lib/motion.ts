import type { Transition } from 'motion/react'

/**
 * The app's springs, named for what they move, so a selection slides the same
 * way wherever it appears. Apple-style: duration and bounce rather than
 * stiffness and damping.
 */

/** A selection indicator sliding to its new place: segmented controls, tab capsules. */
export const SPRING_SELECTION: Transition = { type: 'spring', bounce: 0.12, duration: 0.32 }

/** A screen pushed onto, or popped off, the navigation stack. Critically damped. */
export const SPRING_PUSH: Transition = { type: 'spring', bounce: 0, duration: 0.42 }
