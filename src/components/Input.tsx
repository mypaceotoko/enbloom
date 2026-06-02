import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ className, label, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-2 text-sm font-semibold text-theme-text" htmlFor={inputId}>
      {label ? <span>{label}</span> : null}
      <input
        className={cn(
          'min-h-12 w-full rounded-2xl border border-theme-main/20 bg-white/70 px-4 text-theme-text outline-none transition placeholder:text-theme-muted focus:border-theme-main focus:ring-4 focus:ring-theme-main/15',
          className,
        )}
        id={inputId}
        {...props}
      />
    </label>
  );
}
