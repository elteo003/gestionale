/** Motion tokens — single source for timing (tactile, minimal, consistent). */

/** Steep ease-out (animations.dev expo). Built-in ease-out is too weak. */
export const EASE_OUT = [0.19, 1, 0.22, 1] as const;

export const DURATION = {
    instant: 0.12,
    fast: 0.18,
    normal: 0.22,
    slow: 0.22,
} as const;

export const STAGGER = {
    tight: 0.03,
    normal: 0.05,
    relaxed: 0.06,
} as const;

export const SPRING = {
    /** Buttons, toggles, small UI — high damping, no bounce */
    snap: { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.7 },
    /** Panels, cards entering view */
    panel: { type: 'spring' as const, stiffness: 380, damping: 34, mass: 0.85 },
    /** Drag overlay, emphasis */
    soft: { type: 'spring' as const, stiffness: 280, damping: 32, mass: 0.95 },
};

export const TRANSITION = {
    fast: { duration: DURATION.fast, ease: EASE_OUT },
    normal: { duration: DURATION.normal, ease: EASE_OUT },
    slow: { duration: DURATION.slow, ease: EASE_OUT },
};
