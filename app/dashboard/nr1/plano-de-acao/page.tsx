"use client";

import { Nr1ProgressDashboard } from "@/components/nr1/Nr1ProgressDashboard";
import { Nr1JourneyCard } from "@/components/nr1/Nr1JourneyCard";

import { Nr1StepGuard } from "@/components/nr1/Nr1StepGuard";
import { Nr1AutosaveNoteCard } from "@/components/nr1/Nr1AutosaveNoteCard";
import { useNr1LocalAutosave } from "@/hooks/useNr1LocalAutosave";

export default function Nr1PlanoAcaoPage() {
  const autosave = useNr1LocalAutosave("nr1:plano-acao:draft", "");

  return (
    <Nr1StepGuard
      stepKey="plano-de-acao"
      title="Plano de acao"
      description="Rascunho local com autosave visivel para registrar a primeira versao do plano."
    >
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <Nr1ProgressDashboard currentStep="plano-de-acao" />
        <Nr1JourneyCard currentStep="plano-de-acao" />
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Plano de acao</h1>
          <p className="text-sm text-slate-600">
            Rascunho local com autosave visivel para registrar a primeira versao do plano.
          </p>
        </header>

        <Nr1AutosaveNoteCard
          title="Rascunho local"
          description="As alteracoes desta etapa sao salvas automaticamente no navegador."
          statusLabel={autosave.statusLabel}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Observacoes iniciais do plano de acao
          </label>
          <textarea
            className="min-h-[240px] w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-slate-500"
            placeholder="Descreva aqui prioridades, responsaveis e ideias de medidas..."
            value={autosave.value}
            onChange={(e) => autosave.setValue(e.target.value)}
          />
        </section>
      </main>
    </Nr1StepGuard>
  );
}





