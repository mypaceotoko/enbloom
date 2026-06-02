import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function Badge({ className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-theme-accent-soft px-3 py-1 text-xs font-semibold text-theme-text',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
