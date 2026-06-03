import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'border border-theme-sky/30 bg-gradient-to-r from-theme-yellow/90 via-theme-cyan/55 to-theme-sky/70 text-theme-main-dark shadow-lg shadow-theme-sky/20 hover:shadow-theme-cyan/20 hover:saturate-110',
  secondary: 'border border-theme-sky/30 bg-theme-card/95 text-theme-main-dark shadow-sm shadow-theme-sky/10 hover:bg-theme-accent-soft',
  ghost: 'bg-transparent text-theme-main-dark hover:bg-theme-accent-soft/80',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
};

export function Button({ className, variant = 'primary', children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
