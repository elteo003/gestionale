import type { Variants } from 'framer-motion';
import { DURATION, EASE_OUT, STAGGER } from './presets';

export const fadeUp: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { duration: DURATION.normal, ease: EASE_OUT },
    },
    exit: {
        opacity: 0,
        transition: { duration: DURATION.fast, ease: EASE_OUT },
    },
};

export const fade: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: DURATION.fast, ease: EASE_OUT } },
    exit: { opacity: 0, transition: { duration: DURATION.instant, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.96 },
    show: {
        opacity: 1,
        scale: 1,
        transition: { duration: DURATION.normal, ease: EASE_OUT },
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        transition: { duration: DURATION.fast, ease: EASE_OUT },
    },
};

export const bentoStagger: Variants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: STAGGER.normal,
            delayChildren: 0,
        },
    },
};

export const listStagger: Variants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: STAGGER.tight,
            delayChildren: 0,
        },
    },
};

export const listItem: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { duration: DURATION.fast, ease: EASE_OUT },
    },
};

export const dropdown: Variants = {
    hidden: { opacity: 0, y: -4, scale: 0.98 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: DURATION.fast, ease: EASE_OUT },
    },
    exit: {
        opacity: 0,
        y: -4,
        scale: 0.98,
        transition: { duration: DURATION.instant, ease: EASE_OUT },
    },
};
