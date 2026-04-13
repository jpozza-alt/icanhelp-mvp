import Link from "next/link";
import type { ReactNode } from "react";

type AppShellSection = "dashboard" | "nr1";

type AppShellProps = {
  title: string;
  description?: string;
  active: AppShellSection;
  children: ReactNode;
};

const navItems: Array<{
  key: AppShellSection;
  href: string;
  label: string;
  helper: string;
}> = [
  {
    key: "dashboard",
    href: "/dashboard",
    label: "Painel",
    helper: "visao geral",
  },
  {
    key: "nr1",
    href: "/dashboard/nr1",
    label: "Adequacao NR-1",
    helper: "jornada guiada",
  },
];

export default function AppShell({
  title,
  description,
  active,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#22313F]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="w-full border-b border-[#D9E0E7] bg-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-6 py-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                icanHelp
              </div>
              <div className="mt-2 text-xl font-semibold text-[#22313F]">
                Consultoria executiva humana
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5B6B79]">
                Metodo, clareza e organizacao para transformar exigencia tecnica em proximo passo pratico.
              </p>
            </div>

            <nav className="mt-8 space-y-3">
              {navItems.map((item) => {
                const isActive = item.key === active;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={
                      isActive
                        ? "block rounded-2xl border border-[#C8D5E2] bg-[#EEF4F8] px-4 py-4"
                        : "block rounded-2xl border border-transparent px-4 py-4 transition hover:border-[#D9E0E7] hover:bg-[#F7F8FA]"
                    }
                  >
                    <div className="text-sm font-semibold text-[#22313F]">{item.label}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#5B6B79]">
                      {item.helper}
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[#5E7A96]">
                Entrega percebida
              </div>
              <div className="mt-3 text-sm font-semibold text-[#22313F]">
                Menos duvida, mais metodo
              </div>
              <p className="mt-2 text-sm leading-6 text-[#5B6B79]">
                A interface nao deve parecer um sistema pesado. Ela deve parecer uma solucao pronta para conduzir o trabalho.
              </p>
            </div>

            <div className="mt-auto pt-8 text-xs text-[#7A8A98]">
              pacote visual claro, leve e orientado a decisao
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-[#D9E0E7] bg-[#F7F8FA]">
            <div className="mx-auto max-w-5xl px-6 py-8">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                plataforma institucional
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#22313F]">
                {title}
              </h1>
              {description ? (
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5B6B79]">
                  {description}
                </p>
              ) : null}
            </div>
          </header>

          <section className="mx-auto max-w-5xl px-6 py-8">{children}</section>
        </main>
      </div>
    </div>
  );
}