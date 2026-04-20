"use client";

import { Nr1AutosaveNoteCard } from "@/components/nr1/Nr1AutosaveNoteCard";
import { useNr1LocalAutosave } from "@/hooks/useNr1LocalAutosave";

export function Nr1DiagnosisDraftCard() {
  const autosave = useNr1LocalAutosave("nr1:diagnostico-inicial:draft", "");

  return (
    <section className="flex flex-col gap-4">
      <Nr1AutosaveNoteCard
        title="Rascunho do diagnóstico"
        description="As alterações desta etapa são salvas automaticamente no navegador."
        statusLabel={autosave.statusLabel}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Observações iniciais do diagnóstico
        </label>
        <textarea
          className="min-h-[220px] w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-slate-500"
          placeholder="Registre aqui o contexto inicial, hipóteses, observações e notas da consultora..."
          value={autosave.value}
          onChange={(e) => autosave.setValue(e.target.value)}
        />
      </section>
    </section>
  );
}
