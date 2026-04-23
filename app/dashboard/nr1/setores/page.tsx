"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Nr1WorkspaceContextBar from "@/components/nr1/Nr1WorkspaceContextBar";
import { Nr1JourneyCard } from "@/components/nr1/Nr1JourneyCard";
import { Nr1ProgressDashboard } from "@/components/nr1/Nr1ProgressDashboard";
import { Nr1StepGuard } from "@/components/nr1/Nr1StepGuard";
import {
  clearNr1SetoresLocalDraft,
  completeNr1SetoresLocalDraft,
  getNr1SetoresLocalProgress,
  getNr1SetoresMissingFields,
  readNr1SetoresLocalDraft,
  writeNr1SetoresLocalDraft,
  type Nr1SetoresLocalDraft,
} from "@/lib/nr1-setores-local";

type SaveStatus = "loading" | "idle" | "dirty" | "saving" | "saved" | "error";

const FIELD_LABELS: Record<string, string> = {
  "setores mapeados": "Setores mapeados",
  "atividades criticas": "Atividades criticas",
  "quantidade de setores": "Quantidade de setores",
  "quantidade de trabalhadores expostos": "Quantidade de trabalhadores expostos",
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Ainda nao salvo";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ainda nao salvo";
  }

  return date.toLocaleString("pt-BR");
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const baseClassName =
    "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900";

  return (
    <label htmlFor={props.id} className="block">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      {props.multiline ? (
        <textarea
          id={props.id}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
          rows={4}
          className={baseClassName}
        />
      ) : (
        <input
          id={props.id}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
          className={baseClassName}
        />
      )}
    </label>
  );
}

function Toggle(props: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      htmlFor={props.id}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3"
    >
      <input
        id={props.id}
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <span className="text-sm text-slate-800">{props.label}</span>
    </label>
  );
}

export default function Nr1SetoresPage() {
  const [draft, setDraft] = useState<Nr1SetoresLocalDraft>(() => readNr1SetoresLocalDraft());
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [feedback, setFeedback] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const loaded = readNr1SetoresLocalDraft();
    setDraft(loaded);
    setHydrated(true);
    setLastSavedAt(loaded.updatedAt);
    setSaveStatus(loaded.updatedAt ? "saved" : "idle");
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    setSaveStatus("dirty");

    const timer = window.setTimeout(() => {
      try {
        setSaveStatus("saving");
        const saved = writeNr1SetoresLocalDraft(draft);
        setLastSavedAt(saved.updatedAt);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, hydrated]);

  const missingFields = useMemo(() => getNr1SetoresMissingFields(draft), [draft]);
  const progress = useMemo(() => getNr1SetoresLocalProgress(draft), [draft]);

  function updateTextField(field: keyof Nr1SetoresLocalDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      isCompleted: false,
      completedAt: null,
    }));
    setFeedback("");
  }

  function updateBooleanField(field: keyof Nr1SetoresLocalDraft, value: boolean) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      isCompleted: false,
      completedAt: null,
    }));
    setFeedback("");
  }

  function handleManualSave() {
    try {
      setSaveStatus("saving");
      const saved = writeNr1SetoresLocalDraft(draft);
      setLastSavedAt(saved.updatedAt);
      setSaveStatus("saved");
      setFeedback("Rascunho de setores salvo localmente.");
    } catch {
      setSaveStatus("error");
      setFeedback("Falha ao salvar o rascunho de setores.");
    }
  }

  function handleClearDraft() {
    const confirmed = window.confirm("Limpar o rascunho local de setores?");
    if (!confirmed) {
      return;
    }

    const cleared = clearNr1SetoresLocalDraft();
    setDraft(cleared);
    setLastSavedAt(cleared.updatedAt);
    setSaveStatus("idle");
    setFeedback("Rascunho local de setores removido.");
  }

  function handleComplete() {
    const missing = getNr1SetoresMissingFields(draft);

    if (missing.length > 0) {
      const readable = missing.map((item) => FIELD_LABELS[item] ?? item).join(", ");
      setFeedback(`Preencha os campos obrigatorios antes de concluir: ${readable}.`);
      return;
    }

    try {
      writeNr1SetoresLocalDraft(draft);
      const completed = completeNr1SetoresLocalDraft();
      setDraft(completed);
      setLastSavedAt(completed.updatedAt);
      setSaveStatus("saved");
      setFeedback("Setores e atividades concluidos localmente.");
    } catch {
      setSaveStatus("error");
      setFeedback("Falha ao concluir a etapa de setores.");
    }
  }

  const saveStatusLabel = (() => {
    switch (saveStatus) {
      case "loading":
        return "Carregando...";
      case "idle":
        return "Sem alteracoes";
      case "dirty":
        return "Alteracoes pendentes";
      case "saving":
        return "Salvando...";
      case "saved":
        return `Salvo agora em ${formatTimestamp(lastSavedAt)}`;
      case "error":
        return "Erro ao salvar";
      default:
        return "Status desconhecido";
    }
  })();

  return (
    <Nr1StepGuard
      stepKey="setores"
      title="Setores e atividades"
      description="Mapeie setores e atividades antes de liberar a leitura de riscos."
    >
      <main className="min-h-screen bg-[#F4F7FB] text-[#132238]">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0F2337_0%,#13495C_60%,#178A8F_100%)] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-[760px]">
                <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">etapa operacional</div>
                <h1 className="mt-4 text-[38px] font-semibold leading-tight">Setores e atividades</h1>
                <p className="mt-3 text-base leading-7 text-white/85">
                  Esta etapa agora deixa de ser so visual. O objetivo e montar uma base real de setores,
                  atividades e interfaces de trabalho para liberar a etapa de riscos.
                </p>
              </div>

              <div className="grid min-w-[300px] gap-3 rounded-[22px] border border-white/20 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/85">Progresso local</span>
                  <strong id="nr1SetoresProgressPercent">{progress}%</strong>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div
                  id="nr1SetoresSaveStatus"
                  className={`rounded-xl px-3 py-2 text-sm ${
                    saveStatus === "error"
                      ? "bg-red-50 text-red-700"
                      : saveStatus === "saving"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {saveStatusLabel}
                </div>

                <div className="text-sm text-white/85">
                  Status da etapa:{" "}
                  <strong id="nr1SetoresStatus">
                    {draft.isCompleted ? "Concluido" : "Em andamento"}
                  </strong>
                </div>

                <div className="text-sm text-white/85">
                  Conclusao formal:{" "}
                  <strong id="nr1SetoresCompletedAt">
                    {draft.completedAt ? formatTimestamp(draft.completedAt) : "Ainda nao concluida"}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-[18px]">
            <Nr1WorkspaceContextBar />
          </div>

          <section className="mt-[18px] grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Nr1ProgressDashboard currentStep="setores" />
            <Nr1JourneyCard currentStep="setores" />
          </section>

          {feedback ? (
            <section
              id="nr1SetoresFeedbackBanner"
              className={`mt-[18px] rounded-[20px] border px-4 py-3 text-sm ${
                draft.isCompleted
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : feedback.toLowerCase().includes("falha") || feedback.toLowerCase().includes("preencha")
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-[#DBE5F0] bg-white text-[#132238]"
              }`}
            >
              {feedback}
            </section>
          ) : null}

          <section className="mt-[18px] grid gap-[18px] lg:grid-cols-2">
            <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
              <h2 className="text-2xl font-semibold">Mapa minimo dos setores</h2>
              <p className="mt-3 text-sm leading-7 text-[#60718A]">
                Registre a estrutura operacional real antes de falar em risco. O foco aqui e o trabalho
                como ele acontece.
              </p>

              <div className="mt-6 grid gap-4">
                <Field
                  id="quantidadeSetores"
                  label="Quantidade de setores"
                  value={draft.quantidadeSetores}
                  onChange={(value) => updateTextField("quantidadeSetores", value)}
                  placeholder="Ex.: 4"
                />
                <Field
                  id="quantidadeTrabalhadoresExpostos"
                  label="Quantidade de trabalhadores expostos"
                  value={draft.quantidadeTrabalhadoresExpostos}
                  onChange={(value) => updateTextField("quantidadeTrabalhadoresExpostos", value)}
                  placeholder="Ex.: 18"
                />
                <Field
                  id="setoresMapeados"
                  label="Setores mapeados"
                  value={draft.setoresMapeados}
                  onChange={(value) => updateTextField("setoresMapeados", value)}
                  placeholder="Ex.: Administrativo, Financeiro, Operacional, Externo"
                  multiline={true}
                />
                <Field
                  id="atividadesCriticas"
                  label="Atividades criticas por setor"
                  value={draft.atividadesCriticas}
                  onChange={(value) => updateTextField("atividadesCriticas", value)}
                  placeholder="Descreva as principais atividades e onde a leitura de risco vai precisar aprofundar."
                  multiline={true}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
              <h2 className="text-2xl font-semibold">Interfaces e sinais operacionais</h2>
              <p className="mt-3 text-sm leading-7 text-[#60718A]">
                Use linguagem simples. O objetivo e enxergar interfaces, repeticao e exposicoes que vao
                orientar a proxima etapa.
              </p>

              <div className="mt-6 grid gap-3">
                <Toggle
                  id="possuiAtendimentoPublicoSetores"
                  label="Ha setores com atendimento ao publico ou contato frequente com cliente?"
                  checked={draft.possuiAtendimentoPublico}
                  onChange={(value) => updateBooleanField("possuiAtendimentoPublico", value)}
                />
                <Toggle
                  id="possuiDeslocamentoExternoSetores"
                  label="Ha setores com deslocamento externo, execucao em campo ou fora da base fixa?"
                  checked={draft.possuiDeslocamentoExterno}
                  onChange={(value) => updateBooleanField("possuiDeslocamentoExterno", value)}
                />
                <Toggle
                  id="possuiAtividadeRepetitivaSetores"
                  label="Ha setores com atividade repetitiva, concentrada ou sobrecarga recorrente?"
                  checked={draft.possuiAtividadeRepetitiva}
                  onChange={(value) => updateBooleanField("possuiAtividadeRepetitiva", value)}
                />
                <Field
                  id="interfacesEntreSetores"
                  label="Interfaces entre setores"
                  value={draft.interfacesEntreSetores}
                  onChange={(value) => updateTextField("interfacesEntreSetores", value)}
                  placeholder="Ex.: atendimento aciona financeiro, operacional depende de compras, etc."
                  multiline={true}
                />
                <Field
                  id="observacoesSetores"
                  label="Observacoes do avaliador"
                  value={draft.observacoes}
                  onChange={(value) => updateTextField("observacoes", value)}
                  placeholder="Registre aqui as notas locais desta etapa."
                  multiline={true}
                />
              </div>
            </div>
          </section>

          <section className="mt-[18px] rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Pendencias para conclusao</h2>
                <p className="mt-3 text-sm leading-7 text-[#60718A]">
                  Este primeiro corte de setores exige os campos minimos abaixo para liberar riscos.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {missingFields.length === 0 ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                      Todos os campos obrigatorios foram preenchidos.
                    </span>
                  ) : (
                    missingFields.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800"
                      >
                        {FIELD_LABELS[item] ?? item}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  id="salvarSetoresAgora"
                  type="button"
                  onClick={handleManualSave}
                  className="rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
                >
                  Salvar agora
                </button>
                <button
                  id="concluirSetores"
                  type="button"
                  onClick={handleComplete}
                  className="rounded-[14px] bg-[#0F7B83] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0d6a70]"
                >
                  Concluir setores e atividades
                </button>
                <button
                  id="limparSetoresRascunho"
                  type="button"
                  onClick={handleClearDraft}
                  className="rounded-[14px] border border-[#DBE5F0] bg-white px-4 py-3 text-sm font-semibold text-[#132238] transition hover:bg-[#F8FBFF]"
                >
                  Limpar rascunho local
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Link
                href="/dashboard/nr1/diagnostico-inicial"
                className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 py-4 text-sm font-semibold text-[#132238] transition hover:border-[#13A3A8] hover:bg-white"
              >
                Voltar ao diagnostico inicial
              </Link>
              <Link
                href="/dashboard/nr1/riscos"
                className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 py-4 text-sm font-semibold text-[#132238] transition hover:border-[#13A3A8] hover:bg-white"
              >
                Ir para riscos
              </Link>
            </div>
          </section>
        </div>
      </main>
    </Nr1StepGuard>
  );
}