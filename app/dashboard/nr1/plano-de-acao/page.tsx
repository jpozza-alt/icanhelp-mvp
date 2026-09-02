"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Nr1WorkspaceContextBar from "@/components/nr1/Nr1WorkspaceContextBar";
import { useNr1WorkspaceContext } from "@/lib/nr1-workspace-context";
import { Nr1JourneyCard } from "@/components/nr1/Nr1JourneyCard";
import { Nr1ProgressDashboard } from "@/components/nr1/Nr1ProgressDashboard";
import { Nr1StepGuard } from "@/components/nr1/Nr1StepGuard";
import {
  clearNr1PlanoLocalDraft,
  completeNr1PlanoLocalDraft,
  createEmptyNr1PlanoLocalDraft,
  getNr1PlanoLocalProgress,
  getNr1PlanoMissingFields,
  readNr1PlanoLocalDraft,
  writeNr1PlanoLocalDraft,
  type Nr1PlanoLocalDraft,
  type Nr1PlanoLocalScope,
} from "@/lib/nr1-plano-local";

type SaveStatus = "loading" | "idle" | "dirty" | "saving" | "saved" | "error";

const FIELD_LABELS: Record<string, string> = {
  "medidas prioritarias": "Medidas prioritarias",
  "responsaveis": "Responsaveis",
  "prazos": "Prazos",
  "criterios de acompanhamento": "Criterios de acompanhamento",
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

export default function Nr1PlanoAcaoPage() {
  const contextState = useNr1WorkspaceContext();
  const localScope = useMemo<Nr1PlanoLocalScope | null>(() => {
    if (contextState.status !== "ready") return null;
    return {
      userId: contextState.context.userId,
      tenantId: contextState.context.tenantId,
      establishmentId: contextState.context.establishmentId,
    };
  }, [contextState]);
  const localScopeKey = localScope
    ? `${localScope.userId}:${localScope.tenantId}:${localScope.establishmentId}`
    : null;
  const [draft, setDraft] = useState<Nr1PlanoLocalDraft>(() => createEmptyNr1PlanoLocalDraft());
  const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
  const hydrated = localScopeKey !== null && loadedScopeKey === localScopeKey;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [feedback, setFeedback] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!localScope || !localScopeKey) {
        setLoadedScopeKey(null);
        setDraft(createEmptyNr1PlanoLocalDraft());
        setLastSavedAt(null);
        setSaveStatus("loading");
        return;
      }
      const loaded = readNr1PlanoLocalDraft(localScope);
      setDraft(loaded);
      setLoadedScopeKey(localScopeKey);
      setLastSavedAt(loaded.updatedAt);
      setSaveStatus(loaded.updatedAt ? "saved" : "idle");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [localScope, localScopeKey]);

  useEffect(() => {
    if (!hydrated || !localScope) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        setSaveStatus("saving");
        const saved = writeNr1PlanoLocalDraft(draft, localScope);
        setLastSavedAt(saved.updatedAt);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, hydrated, localScope]);

  const missingFields = useMemo(() => getNr1PlanoMissingFields(draft), [draft]);
  const progress = useMemo(() => getNr1PlanoLocalProgress(draft), [draft]);

  function updateTextField(field: keyof Nr1PlanoLocalDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      isCompleted: false,
      completedAt: null,
    }));
    setSaveStatus("dirty");
    setFeedback("");
  }

  function handleManualSave() {
    if (!localScope) return;
    try {
      setSaveStatus("saving");
      const saved = writeNr1PlanoLocalDraft(draft, localScope);
      setLastSavedAt(saved.updatedAt);
      setSaveStatus("saved");
      setFeedback("Rascunho do plano salvo localmente.");
    } catch {
      setSaveStatus("error");
      setFeedback("Falha ao salvar o rascunho do plano.");
    }
  }

  function handleClearDraft() {
    if (!localScope) return;
    const confirmed = window.confirm("Limpar o rascunho local do plano?");
    if (!confirmed) {
      return;
    }

    const cleared = clearNr1PlanoLocalDraft(localScope);
    setDraft(cleared);
    setLastSavedAt(cleared.updatedAt);
    setSaveStatus("idle");
    setFeedback("Rascunho local do plano removido.");
  }

  function handleComplete() {
    if (!localScope) return;
    const missing = getNr1PlanoMissingFields(draft);

    if (missing.length > 0) {
      const readable = missing.map((item) => FIELD_LABELS[item] ?? item).join(", ");
      setFeedback(`Preencha os campos obrigatorios antes de concluir: ${readable}.`);
      return;
    }

    try {
      writeNr1PlanoLocalDraft(draft, localScope);
      const completed = completeNr1PlanoLocalDraft(localScope);
      setDraft(completed);
      setLastSavedAt(completed.updatedAt);
      setSaveStatus("saved");
      setFeedback("Plano de acao concluido localmente.");
    } catch {
      setSaveStatus("error");
      setFeedback("Falha ao concluir a etapa de plano de acao.");
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
      stepKey="plano-de-acao"
      title="Plano de acao"
      description="Monte a primeira versao do plano antes de seguir para evidencias e acompanhamento."
    >
      <main className="min-h-screen bg-[#F4F7FB] text-[#132238]">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0F2337_0%,#13495C_60%,#178A8F_100%)] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-[760px]">
                <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">etapa de resposta</div>
                <h1 className="mt-4 text-[38px] font-semibold leading-tight">Plano de acao</h1>
                <p className="mt-3 text-base leading-7 text-white/85">
                  Esta etapa deixa de ser apenas um bloco de notas. Agora ela registra medidas,
                  responsaveis, prazos e criterios de acompanhamento para organizar a resposta inicial.
                </p>
              </div>

              <div className="grid min-w-[300px] gap-3 rounded-[22px] border border-white/20 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/85">Progresso local</span>
                  <strong id="nr1PlanoProgressPercent">{progress}%</strong>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div
                  id="nr1PlanoSaveStatus"
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
                  <strong id="nr1PlanoStatus">
                    {draft.isCompleted ? "Concluido" : "Em andamento"}
                  </strong>
                </div>

                <div className="text-sm text-white/85">
                  Conclusao formal:{" "}
                  <strong id="nr1PlanoCompletedAt">
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
            <Nr1ProgressDashboard currentStep="plano-de-acao" />
            <Nr1JourneyCard currentStep="plano-de-acao" />
          </section>

          {feedback ? (
            <section
              id="nr1PlanoFeedbackBanner"
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
              <h2 className="text-2xl font-semibold">Resposta inicial</h2>
              <p className="mt-3 text-sm leading-7 text-[#60718A]">
                Estruture a primeira resposta com foco prático e rastreável.
              </p>

              <div className="mt-6 grid gap-4">
                <Field
                  id="medidasPrioritarias"
                  label="Medidas prioritarias"
                  value={draft.medidasPrioritarias}
                  onChange={(value) => updateTextField("medidasPrioritarias", value)}
                  placeholder="Ex.: redistribuir carga, revisar atendimento, criar pausa, ajustar rotina..."
                  multiline={true}
                />
                <Field
                  id="responsaveis"
                  label="Responsaveis"
                  value={draft.responsaveis}
                  onChange={(value) => updateTextField("responsaveis", value)}
                  placeholder="Ex.: gestor da unidade, RH, SST, lideranca imediata..."
                  multiline={true}
                />
                <Field
                  id="prazos"
                  label="Prazos"
                  value={draft.prazos}
                  onChange={(value) => updateTextField("prazos", value)}
                  placeholder="Ex.: 15 dias, 30 dias, imediato..."
                  multiline={true}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
              <h2 className="text-2xl font-semibold">Execucao e acompanhamento</h2>
              <p className="mt-3 text-sm leading-7 text-[#60718A]">
                Registre os recursos e como a empresa vai acompanhar a execucao inicial.
              </p>

              <div className="mt-6 grid gap-4">
                <Field
                  id="recursosNecessarios"
                  label="Recursos necessarios"
                  value={draft.recursosNecessarios}
                  onChange={(value) => updateTextField("recursosNecessarios", value)}
                  placeholder="Ex.: tempo de lideranca, treinamento, ajuste de layout, apoio externo..."
                  multiline={true}
                />
                <Field
                  id="criteriosAcompanhamento"
                  label="Criterios de acompanhamento"
                  value={draft.criteriosAcompanhamento}
                  onChange={(value) => updateTextField("criteriosAcompanhamento", value)}
                  placeholder="Ex.: reuniao quinzenal, checklist, evidencias de execucao, responsavel por validar..."
                  multiline={true}
                />
                <Field
                  id="observacoesPlano"
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
                  Este corte de plano exige os campos minimos abaixo para concluir a etapa.
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
                  id="salvarPlanoAgora"
                  type="button"
                  onClick={handleManualSave}
                  className="rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
                >
                  Salvar agora
                </button>
                <button
                  id="concluirPlano"
                  type="button"
                  onClick={handleComplete}
                  className="rounded-[14px] bg-[#0F7B83] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0d6a70]"
                >
                  Concluir plano de acao
                </button>
                <button
                  id="limparPlanoRascunho"
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
                href="/dashboard/nr1/riscos"
                className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 py-4 text-sm font-semibold text-[#132238] transition hover:border-[#13A3A8] hover:bg-white"
              >
                Voltar para riscos
              </Link>
              <Link
                href="/dashboard/nr1/evidencias-acompanhamento"
                className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 py-4 text-sm font-semibold text-[#132238] transition hover:border-[#13A3A8] hover:bg-white"
              >
                Ir para evidencias e acompanhamento
              </Link>
            </div>
          </section>
        </div>
      </main>
    </Nr1StepGuard>
  );
}