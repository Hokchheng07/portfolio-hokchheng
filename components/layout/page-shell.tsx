import type { ReactNode } from "react";

export function PageShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-24 pt-36 sm:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
        {eyebrow}
      </p>
      <h1 className="mt-4 font-serif text-[clamp(3rem,7vw,6rem)] leading-[1.05] tracking-[0.01em]">
        {title}
      </h1>
      <div className="mt-10 text-muted">{children}</div>
    </main>
  );
}
