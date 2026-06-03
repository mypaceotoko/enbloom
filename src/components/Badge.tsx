import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-theme-sky/20 bg-theme-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-theme-main-dark shadow-sm shadow-theme-main/5 [&_svg]:size-3',
        className,
      )}
      {...props}
    />
  );
}
