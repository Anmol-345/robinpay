// =============================================================================
// components/ui/cn.ts — Utility for tailwind class merging
// =============================================================================
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
