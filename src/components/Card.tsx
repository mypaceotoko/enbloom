import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return <div className={cn('soft-shadow rounded-[1.35rem] border border-theme-border/80 bg-theme-card p-4', className)} {...props} />;
}
