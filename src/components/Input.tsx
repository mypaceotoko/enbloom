import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  helperText?: ReactNode;
  label?: string;
};

export function Input({ className, helperText, label, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-2 text-sm font-semibold text-theme-text" htmlFor={inputId}>
      {label ? <span>{label}</span> : null}
      <input
        className={cn(
          'theme-input min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition',
          className,
        )}
        id={inputId}
        {...props}
      />
      {helperText ? <span className="block text-xs font-medium leading-5 text-theme-muted">{helperText}</span> : null}
    </label>
  );
}
