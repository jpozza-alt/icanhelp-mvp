"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Nr1WorkspaceContextBar from "@/components/nr1/Nr1WorkspaceContextBar";
import {
  clearNr1DiagnosticoLocalDraft,
  completeNr1DiagnosticoLocalDraft,
  getNr1DiagnosticoLocalProgress,
  getNr1DiagnosticoMissingFields,
  readNr1DiagnosticoLocalDraft,
  writeNr1DiagnosticoLocalDraft,
  type Nr1DiagnosticoLocalDraft,
} from "@/lib/nr1-diagnostico-local";

type SaveStatus = "loading" | "idle" | "dirty" | "saving" | "saved" | "error";

const FIELD_LABELS: Record<string, string> = {
  "nome da empresa": "Nome da empresa",
  "nome do estabelecimento": "Nome do estabelecimento",
  "numero de trabalhadores": "Numero de trabalhadores",
  "setores mapeados": "Setores mapeados",
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

export default function Nr1DiagnosticoInicialPage() {
  const [draft, setDraft] = useState<Nr1DiagnosticoLocalDraft>(() => readNr1DiagnosticoLocalDraft());
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [feedback, setFeedback] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const loaded = readNr1DiagnosticoLocalDraft();
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
        const saved = writeNr1DiagnosticoLocalDraft(draft);
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

  const missingFields = useMemo(() => getNr1DiagnosticoMissingFields(draft), [draft]);
  const progress = useMemo(() => getNr1DiagnosticoLocalProgress(draft), [draft]);

  function updateTextField(field: keyof Nr1DiagnosticoLocalDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      isCompleted: false,
      completedAt: null,
    }));
    setFeedback("");
  }

  function updateBooleanField(field: keyof Nr1DiagnosticoLocalDraft, value: boolean) {
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
      const saved = writeNr1DiagnosticoLocalDraft(draft);
      setLastSavedAt(saved.updatedAt);
      setSaveStatus("saved");
      setFeedback("Rascunho salvo localmente.");
    } catch {
      setSaveStatus("error");
      setFeedback("Falha ao salvar o rascunho local.");
    }
  }

  function handleClearDraft() {
    const confirmed = window.confirm("Limpar o rascunho local do diagnostico inicial?");
    if (!confirmed) {
      return;
    }

    const cleared = clearNr1DiagnosticoLocalDraft();
    setDraft(cleared);
    setLastSavedAt(cleared.updatedAt);
    setSaveStatus("idle");
    setFeedback("Rascunho local removido.");
  }

  function handleComplete() {
    const missing = getNr1DiagnosticoMissingFields(draft);

    if (missing.length > 0) {
      const readable = missing.map((item) => FIELD_LABELS[item] ?? item).join(", ");
      setFeedback(`Preencha os campos obrigatorios antes de concluir: ${readable}.`);
      return;
    }

    try {
      writeNr1DiagnosticoLocalDraft(draft);
      const completed = completeNr1DiagnosticoLocalDraft();
      setDraft(completed);
      setLastSavedAt(completed.updatedAt);
      setSaveStatus("saved");
      setFeedback("Diagnostico inicial concluido localmente.");
    } catch {
      setSaveStatus("error");
      setFeedback("Falha ao concluir o diagnostico inicial local.");
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
    <main className="min-h-screen bg-[#F3F7FB] px-4 py-6 text-[#132238] md:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] p-6 text-white shadow-[0_12px_36px_rgba(19,163,168,0.28)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">
                Jornada NR1
              </div>
              <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
                Diagnostico Inicial
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/90">
                Esta etapa agora e preenchivel. Ela salva rascunho local, mostra autosave visivel
                e registra a conclusao formal do diagnostico inicial para destravar riscos e plano
                de acao.
              </p>
            </div>

            <div className="grid min-w-[290px] gap-3 rounded-[22px] border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/85">Progresso local</span>
                <strong id="nr1ProgressPercent">{progress}%</strong>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div
                id="nr1SaveStatus"
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
                <strong id="nr1DiagnosticoStatus">
                  {draft.isCompleted ? "Concluido" : "Em andamento"}
                </strong>
              </div>

              <div className="text-sm text-white/85">
                Conclusao formal:{" "}
                <strong id="nr1DiagnosticoCompletedAt">
                  {draft.completedAt ? formatTimestamp(draft.completedAt) : "Ainda nao concluida"}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-[18px]">
          <Nr1WorkspaceContextBar />
        </div>

        {feedback ? (
          <section
            id="nr1FeedbackBanner"
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
            <h2 className="text-2xl font-semibold">Contexto minimo do estabelecimento</h2>
            <p className="mt-3 text-sm leading-7 text-[#60718A]">
              O objetivo aqui e transformar a antiga tela de entrada em uma etapa realmente
              preenchivel, simples e operacional.
            </p>

            <div className="mt-6 grid gap-4">
              <Field
                id="empresaNome"
                label="Nome da empresa"
                value={draft.empresaNome}
                onChange={(value) => updateTextField("empresaNome", value)}
                placeholder="Ex.: Empresa Modelo A"
              />
              <Field
                id="estabelecimentoNome"
                label="Nome do estabelecimento"
                value={draft.estabelecimentoNome}
                onChange={(value) => updateTextField("estabelecimentoNome", value)}
                placeholder="Ex.: Matriz A"
              />
              <Field
                id="numeroTrabalhadores"
                label="Numero de trabalhadores"
                value={draft.numeroTrabalhadores}
                onChange={(value) => updateTextField("numeroTrabalhadores", value)}
                placeholder="Ex.: 18"
              />
              <Field
                id="setoresMapeados"
                label="Setores mapeados"
                value={draft.setoresMapeados}
                onChange={(value) => updateTextField("setoresMapeados", value)}
                placeholder="Ex.: Administrativo, Financeiro, Operacional"
                multiline={true}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <h2 className="text-2xl font-semibold">Leitura rapida da organizacao do trabalho</h2>
            <p className="mt-3 text-sm leading-7 text-[#60718A]">
              Linguagem humana, sem clinica. Este primeiro corte prepara riscos, setores e plano
              de acao para a proxima etapa.
            </p>

            <div className="mt-6 grid gap-3">
              <Toggle
                id="possuiAtendimentoPublico"
                label="Ha atendimento ao publico ou contato frequente com cliente dificil?"
                checked={draft.possuiAtendimentoPublico}
                onChange={(value) => updateBooleanField("possuiAtendimentoPublico", value)}
              />
              <Toggle
                id="possuiCobrancaPrazo"
                label="Ha metas, cobranca por prazo ou pressao frequente na rotina?"
                checked={draft.possuiCobrancaPrazo}
                onChange={(value) => updateBooleanField("possuiCobrancaPrazo", value)}
              />
              <Toggle
                id="possuiTrabalhoRepetitivo"
                label="Ha trabalho repetitivo, prolongado ou com sobrecarga em poucas pessoas?"
                checked={draft.possuiTrabalhoRepetitivo}
                onChange={(value) => updateBooleanField("possuiTrabalhoRepetitivo", value)}
              />
              <Field
                id="principaisMudancas"
                label="Principais mudancas recentes ou gargalos percebidos"
                value={draft.principaisMudancas}
                onChange={(value) => updateTextField("principaisMudancas", value)}
                placeholder="Ex.: aumento de demanda, troca de lideranca, mudanca de processo"
                multiline={true}
              />
              <Field
                id="observacoes"
                label="Observacoes do avaliador"
                value={draft.observacoes}
                onChange={(value) => updateTextField("observacoes", value)}
                placeholder="Registre aqui o resumo local desta primeira leitura."
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
                Para este primeiro corte local, os campos obrigatorios sao os minimos abaixo.
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
                id="salvarAgora"
                type="button"
                onClick={handleManualSave}
                className="rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
              >
                Salvar agora
              </button>
              <button
                id="concluirDiagnostico"
                type="button"
                onClick={handleComplete}
                className="rounded-[14px] bg-[#0F7B83] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0d6a70]"
              >
                Concluir diagnostico inicial
              </button>
              <button
                id="limparRascunho"
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
              Ir para riscos
            </Link>
            <Link
              href="/dashboard/nr1/plano-de-acao"
              className="rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 py-4 text-sm font-semibold text-[#132238] transition hover:border-[#13A3A8] hover:bg-white"
            >
              Ir para plano de acao
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}