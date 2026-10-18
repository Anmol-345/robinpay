// =============================================================================
// components/ui/button.tsx — Design-system button primitive
// =============================================================================
import * as React from 'react';
import { cn } from '@/components/ui/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const base =
  'inline-flex items-center justify-center rounded-medium text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

const variants: Record<string, string> = {
  default: 'bg-zinc-900 text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100',
  destructive: 'bg-red-600 text-white shadow hover:bg-red-700',
  outline: 'border border-zinc-300 bg-white shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700',
  ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
  secondary: 'bg-zinc-200 text-zinc-900 shadow-sm hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600',
  link: 'text-zinc-900 underline-offset-4 hover:underline dark:text-white',
};

const sizes: Record<string, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
};

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}
Button.displayName = 'Button';
