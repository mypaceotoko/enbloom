import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-theme-cyan to-theme-main text-white shadow-lg shadow-theme-main/25 hover:shadow-theme-cyan/25 hover:saturate-125',
  secondary: 'border border-theme-sky/35 bg-theme-card text-theme-main-dark shadow-sm shadow-theme-main/5 hover:bg-theme-accent-soft',
  ghost: 'bg-transparent text-theme-main-dark hover:bg-theme-accent-soft',
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
