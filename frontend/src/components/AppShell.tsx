import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: string;
};

export function AppShell({ children, eyebrow, title, subtitle }: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-6 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-app">
        <header className="border-b border-slate-200 bg-slate-950 px-5 pb-5 pt-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
          ) : null}
        </header>
        <section className="flex flex-1 flex-col">{children}</section>
      </div>
    </main>
  );
}
