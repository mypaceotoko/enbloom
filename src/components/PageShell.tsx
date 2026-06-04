import type { ReactNode } from 'react';

type PageShellProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
};

export function PageShell({ title, eyebrow, description, children }: PageShellProps) {
  return (
    <section className="space-y-5 px-4 pb-[calc(var(--bottom-nav-safe-space)+env(safe-area-inset-bottom))] pt-4">
      {title ? (
        <div className="space-y-2">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.22em] text-theme-main">{eyebrow}</p> : null}
          <h1 className="text-2xl font-black leading-tight text-theme-text">{title}</h1>
          {description ? <p className="text-sm leading-6 text-theme-muted">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
