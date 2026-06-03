import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return <div className={cn('soft-shadow rounded-[1.35rem] border border-theme-sky/20 bg-theme-card/97 p-4 backdrop-blur-sm', className)} {...props} />;
}
