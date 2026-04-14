"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type EvidenceFormState = {
  relatedAction: string;
  updateType: string;
  reviewStatus: string;
  nextReviewDate: string;
  notes: string;
};

type EvidenceItem = EvidenceFormState & {
  id: string;
};

const initialForm: EvidenceFormState = {
  relatedAction: "",
  updateType: "",
  reviewStatus: "pendente",
  nextReviewDate: "",
  notes: "",
};

const sectionClassName = "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm";
const inputClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]";
const selectClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";

function getReviewBadgeClass(status: string) {
  switch (status) {
    case "concluido":
      return "border-[#CFE2D4] bg-[#EEF7F0] text-[#4D7A58]";
    case "em revisao":
      return "border-[#D9E0E7] bg-[#F4F7FA] text-[#486273]";
    case "pendente":
      return "border-[#E8D9BE] bg-[#FBF6EB] text-[#8A6732]";
    default:
      return "border-[#E3C7CB] bg-[#F9F1F2] text-[#8A4F58]";
  }
}

export default function Nr1EvidenciasAcompanhamentoPage() {
  const [form, setForm] = useState<EvidenceFormState>(initialForm);
  const [items, setItems] = useState<EvidenceItem[]>([]);

  function updateField<K extends keyof EvidenceFormState>(field: K, value: EvidenceFormState[K]) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
  }

  function handleAddEvidence() {
    if (
      !form.relatedAction.trim() ||
      !form.updateType ||
      !form.reviewStatus ||
      !form.nextReviewDate ||
      !form.notes.trim()
    ) {
      return;
    }

    const nextItem: EvidenceItem = {
      ...form,
      id: crypto.randomUUID(),
    };

    setItems((old) => [...old, nextItem]);
    resetForm();
  }

  function handleRemoveEvidence(id: string) {
    setItems((old) => old.filter((item) => item.id !== id));
  }

  const pendingCount = useMemo(
    () => items.filter((item) => item.reviewStatus === "pendente").length,
    [items]
  );

  const completedCount = useMemo(
    () => items.filter((item) => item.reviewStatus === "concluido").length,
    [items]
  );

  const overdueReviewCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items.filter((item) => {
      if (item.reviewStatus === "concluido") return false;
      const reviewDate = new Date(item.nextReviewDate + "T00:00:00");
      return reviewDate < today;
    }).length;
  }, [items]);

  const nextSignal = useMemo(() => {
    if (items.length === 0) {
      return "Cadastre pelo menos um registro para abrir trilha de evidencias e acompanhamento.";
    }

    if (overdueReviewCount > 0) {
      return "Ha revisao vencida. A plataforma ja tem material para destacar pendencias de acompanhamento.";
    }

    if (pendingCount > 0) {
      return "Existem registros pendentes. A jornada pode mostrar continuidade e necessidade de retorno.";
    }

    return "Trilha inicial de evidencias pronta para sustentar revisao e historico.";
  }, [items.length, overdueReviewCount, pendingCount]);

  return (
    <AppShell
      active="nr1"
      title="Evidencias e acompanhamento"
      description="Quinta etapa da jornada. Aqui o sistema registra trilha, revisoes, observacoes e pendencias para fechar o ciclo de acompanhamento."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Mostra que a empresa nao apenas planejou, mas acompanhou.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            A tela registra marcos de revisao, observacoes de execucao e proximas verificacoes. Isso fecha a sensacao de trilha, metodo e continuidade do trabalho.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                registrar evidencia
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Acao relacionada
                  </label>
                  <input
                    value={form.relatedAction}
                    onChange={(e) => updateField("relatedAction", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: redistribuicao de demandas do atendimento"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Tipo de atualizacao
                  </label>
                  <select
                    value={form.updateType}
                    onChange={(e) => updateField("updateType", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    <option value="revisao">revisao</option>
                    <option value="checagem">checagem</option>
                    <option value="retorno da gestao">retorno da gestao</option>
                    <option value="ajuste de prazo">ajuste de prazo</option>
                    <option value="validacao final">validacao final</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Status da revisao
                  </label>
                  <select
                    value={form.reviewStatus}
                    onChange={(e) => updateField("reviewStatus", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="pendente">pendente</option>
                    <option value="em revisao">em revisao</option>
                    <option value="concluido">concluido</option>
                    <option value="bloqueado">bloqueado</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Proxima data de revisao
                  </label>
                  <input
                    type="date"
                    value={form.nextReviewDate}
                    onChange={(e) => updateField("nextReviewDate", e.target.value)}
                    className={inputClassName}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Observacoes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    className="min-h-[120px] w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
                    placeholder="Ex.: responsavel confirmou mudanca, equipe percebeu melhora parcial, revisar novamente em 10 dias"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAddEvidence}
                  className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
                >
                  Adicionar registro
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
                >
                  Limpar campos
                </button>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                historico registrado
              </div>

              {items.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Nenhum registro de acompanhamento ainda.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {items.map((item, index) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5E7A96]">
                            registro {index + 1}
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                            {item.relatedAction}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                            {item.notes}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(item.id)}
                          className="rounded-xl border border-[#E3C7CB] bg-[#F9F1F2] px-4 py-2 text-sm font-semibold text-[#8A4F58]"
                        >
                          Remover
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Tipo: {item.updateType}
                        </div>
                        <div className={"rounded-full border px-3 py-2 text-xs font-semibold " + getReviewBadgeClass(item.reviewStatus)}>
                          Revisao: {item.reviewStatus}
                        </div>
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Proxima revisao: {item.nextReviewDate}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                leitura da trilha
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    registros
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {items.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    pendentes
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {pendingCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    concluidos
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {completedCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    revisoes vencidas
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {overdueReviewCount}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                {nextSignal}
              </p>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                o que isso prova
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5B6B79]">
                <div>- houve resposta institucional</div>
                <div>- existe revisao programada</div>
                <div>- ha historico de acompanhamento</div>
                <div>- a empresa consegue mostrar evolucao e pendencias</div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                etapa fechada
              </div>

              <div className="mt-4 rounded-2xl border border-[#D9E0E7] bg-white p-4">
                <div className="text-sm font-semibold text-[#22313F]">
                  Jornada principal montada
                </div>
                <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                  Com esta tela, o fluxo principal do modulo NR-1 ja cobre entrada, diagnostico, setores, riscos, plano de acao e acompanhamento.
                </p>
              </div>

              <button
                type="button"
                className="mt-4 rounded-xl bg-[#C8D5E2] px-5 py-3 text-sm font-semibold text-white"
              >
                Revisar jornada completa
              </button>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}