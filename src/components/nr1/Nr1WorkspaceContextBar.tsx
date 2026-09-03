"use client";

import Link from "next/link";
import { useNr1WorkspaceContext } from "@/lib/nr1-workspace-context";
import { useNr1WorkspaceDisplayState } from "@/hooks/useNr1WorkspaceDisplayState";

export default function Nr1WorkspaceContextBar() {
  const contextState = useNr1WorkspaceContext();
  const displayState = useNr1WorkspaceDisplayState(contextState);

  if (
    contextState.status === "loading" ||
    (contextState.status === "ready" && displayState.isLoading)
  ) {
    return (
      <section className="mx-auto mb-6 max-w-6xl rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="text-sm text-slate-500">
          Carregando contexto operacional oficial...
        </div>
      </section>
    );
  }

  if (
    contextState.status !== "ready" ||
    displayState.error ||
    !displayState.companyName ||
    !displayState.establishmentName
  ) {
    return (
      <section className="mx-auto mb-6 max-w-6xl rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Contexto oficial indisponivel
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Confirme empresa e estabelecimento no workspace
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-700">
              O modulo nao conseguiu confirmar os nomes do contexto operacional
              oficial. Volte ao workspace, confira a selecao e tente novamente.
            </p>
          </div>

          <Link
            href="/dashboard/nr1/workspace"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Voltar ao workspace
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mb-6 max-w-6xl rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Contexto operacional ativo
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Empresa ativa
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {displayState.companyName}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Estabelecimento ativo
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {displayState.establishmentName}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Origem: Contexto oficial
          </div>

          <Link
            href="/dashboard/nr1/workspace"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Trocar contexto
          </Link>
        </div>
      </div>
    </section>
  );
}
