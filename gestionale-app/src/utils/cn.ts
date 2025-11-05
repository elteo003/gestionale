/**
 * Utility function per combinare classi CSS
 * Supporta Tailwind e classi condizionali
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

