"use client";

import Link from "next/link";
import { Nr1ProgressDashboard } from "@/components/nr1/Nr1ProgressDashboard";

export default function Nr1ModuleHomePage() {
  const links = [
    {
      href: "/dashboard/nr1/entrar",
      title: "Diagnóstico inicial",
      description: "Comece ou retome a leitura inicial da jornada.",
    },
    {
      href: "/dashboard/nr1/setores",
      title: "Setores",
      description: "Registre setores, estrutura e observações iniciais.",
    },
    {
      href: "/dashboard/nr1/riscos",
      title: "Riscos",
      description: "Organize os riscos identificados e notas de trabalho.",
    },
    {
      href: "/dashboard/nr1/plano-de-acao",
      title: "Plano de ação",
      description: "Consolide prioridades, responsáveis e medidas.",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Módulo NR1
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Jornada guiada do PGR digital
          </h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Use esta área para acompanhar a jornada, retomar a próxima etapa e manter a
            construção do módulo NR1 em um fluxo único e guiado.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/nr1/entrar"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Continuar jornada
          </Link>

          <Link
            href="/dashboard/nr1/setores"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ir para setores
          </Link>
        </div>
      </header>

      <Nr1ProgressDashboard currentStep="diagnostico-inicial" />

      <section className="grid gap-4 md:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="text-sm text-slate-600">{item.description}</p>
              <span className="inline-block text-sm font-medium text-slate-800">
                Abrir etapa
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Leitura rápida</h2>
        <p className="mt-2 text-sm text-slate-600">
          Esta página funciona como hub do módulo. Ela centraliza a continuidade da
          jornada e reduz a sensação de rotas soltas entre diagnóstico, setores, riscos e
          plano de ação.
        </p>
      </section>
    </main>
  );
}

