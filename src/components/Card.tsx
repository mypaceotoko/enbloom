import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('soft-shadow rounded-[1.75rem] border border-white/50 bg-theme-card p-5', className)} {...props}>
      {children}
    </div>
  );
}
