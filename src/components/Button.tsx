import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-theme-main text-white shadow-lg shadow-theme-main/25 hover:bg-theme-main-dark',
  secondary: 'bg-theme-accent-soft text-theme-text hover:bg-theme-accent-soft/80',
  ghost: 'bg-transparent text-theme-main-dark hover:bg-theme-accent-soft',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
};

export function Button({ className, variant = 'primary', children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
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
