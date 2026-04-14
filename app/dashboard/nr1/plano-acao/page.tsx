"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type ActionFormState = {
  sectorName: string;
  relatedRisk: string;
  recommendedAction: string;
  responsible: string;
  dueDate: string;
  priority: string;
  status: string;
  monitoringNotes: string;
};

type ActionItem = ActionFormState & {
  id: string;
};

const initialForm: ActionFormState = {
  sectorName: "",
  relatedRisk: "",
  recommendedAction: "",
  responsible: "",
  dueDate: "",
  priority: "",
  status: "em aberto",
  monitoringNotes: "",
};

const sectionClassName = "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm";
const inputClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]";
const selectClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";

const sectorOptions = [
  "Administrativo",
  "Atendimento",
  "Comercial",
  "Operacional",
  "RH",
  "Outro",
];

function getPriorityBadgeClass(priority: string) {
  switch (priority) {
    case "muito alta":
      return "border-[#E3C7CB] bg-[#F9F1F2] text-[#8A4F58]";
    case "alta":
      return "border-[#E8D9BE] bg-[#FBF6EB] text-[#8A6732]";
    case "media":
      return "border-[#D9E0E7] bg-[#F4F7FA] text-[#486273]";
    default:
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "concluido":
      return "border-[#CFE2D4] bg-[#EEF7F0] text-[#4D7A58]";
    case "em andamento":
      return "border-[#D9E0E7] bg-[#F4F7FA] text-[#486273]";
    case "em aberto":
      return "border-[#E8D9BE] bg-[#FBF6EB] text-[#8A6732]";
    default:
      return "border-[#E3C7CB] bg-[#F9F1F2] text-[#8A4F58]";
  }
}

export default function Nr1PlanoAcaoPage() {
  const [form, setForm] = useState<ActionFormState>(initialForm);
  const [items, setItems] = useState<ActionItem[]>([]);

  function updateField<K extends keyof ActionFormState>(field: K, value: ActionFormState[K]) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
  }

  function handleAddAction() {
    if (
      !form.sectorName ||
      !form.relatedRisk.trim() ||
      !form.recommendedAction.trim() ||
      !form.responsible.trim() ||
      !form.dueDate ||
      !form.priority
    ) {
      return;
    }

    const nextItem: ActionItem = {
      ...form,
      id: crypto.randomUUID(),
    };

    setItems((old) => [...old, nextItem]);
    resetForm();
  }

  function handleRemoveAction(id: string) {
    setItems((old) => old.filter((item) => item.id !== id));
  }

  const overdueOpenCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items.filter((item) => {
      if (item.status === "concluido") return false;
      const due = new Date(item.dueDate + "T00:00:00");
      return due < today;
    }).length;
  }, [items]);

  const highPriorityCount = useMemo(
    () => items.filter((item) => item.priority === "alta" || item.priority === "muito alta").length,
    [items]
  );

  const nextSignal = useMemo(() => {
    if (items.length === 0) {
      return "Cadastre pelo menos uma acao para transformar risco em execucao acompanhavel.";
    }

    if (overdueOpenCount > 0) {
      return "Ha acao vencida e nao concluida. A jornada precisa destacar acompanhamento e resposta da gestao.";
    }

    if (highPriorityCount > 0) {
      return "Existem acoes de prioridade alta. Elas devem aparecer primeiro na devolutiva executiva.";
    }

    return "Plano de acao inicial pronto para acompanhamento.";
  }, [items.length, overdueOpenCount, highPriorityCount]);

  return (
    <AppShell
      active="nr1"
      title="Plano de acao"
      description="Quarta etapa da jornada. Aqui o sistema transforma risco e prioridade em responsavel, prazo, status e acompanhamento."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Converte leitura de risco em resposta concreta da empresa.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            O foco agora deixa de ser apenas entender o problema. A tela organiza quem faz, o que faz, quando entrega, qual o peso da acao e como sera o acompanhamento.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                registrar acao
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Setor
                  </label>
                  <select
                    value={form.sectorName}
                    onChange={(e) => updateField("sectorName", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    {sectorOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Prioridade
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => updateField("priority", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    <option value="baixa">baixa</option>
                    <option value="media">media</option>
                    <option value="alta">alta</option>
                    <option value="muito alta">muito alta</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Risco relacionado
                  </label>
                  <input
                    value={form.relatedRisk}
                    onChange={(e) => updateField("relatedRisk", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: sobrecarga de trabalho no atendimento"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Acao recomendada
                  </label>
                  <textarea
                    value={form.recommendedAction}
                    onChange={(e) => updateField("recommendedAction", e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
                    placeholder="Ex.: redistribuir demandas, revisar prazo e alinhar responsabilidades"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Responsavel
                  </label>
                  <input
                    value={form.responsible}
                    onChange={(e) => updateField("responsible", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: gestora do setor"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Prazo
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => updateField("dueDate", e.target.value)}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="em aberto">em aberto</option>
                    <option value="em andamento">em andamento</option>
                    <option value="concluido">concluido</option>
                    <option value="bloqueado">bloqueado</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Observacoes de acompanhamento
                  </label>
                  <textarea
                    value={form.monitoringNotes}
                    onChange={(e) => updateField("monitoringNotes", e.target.value)}
                    className="min-h-[100px] w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
                    placeholder="Ex.: revisar em 15 dias, conferir reducao de queixas e redistribuicao real das tarefas"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAddAction}
                  className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
                >
                  Adicionar acao
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
                acoes registradas
              </div>

              {items.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Nenhuma acao registrada ainda.
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
                            acao {index + 1}
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                            {item.recommendedAction}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                            Risco relacionado: {item.relatedRisk}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAction(item.id)}
                          className="rounded-xl border border-[#E3C7CB] bg-[#F9F1F2] px-4 py-2 text-sm font-semibold text-[#8A4F58]"
                        >
                          Remover
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <div className={"rounded-full border px-3 py-2 text-xs font-semibold " + getPriorityBadgeClass(item.priority)}>
                          Prioridade: {item.priority}
                        </div>
                        <div className={"rounded-full border px-3 py-2 text-xs font-semibold " + getStatusBadgeClass(item.status)}>
                          Status: {item.status}
                        </div>
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Responsavel: {item.responsible}
                        </div>
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Prazo: {item.dueDate}
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
                leitura executiva
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    acoes cadastradas
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {items.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    alta ou muito alta
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {highPriorityCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    vencidas e nao concluidas
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {overdueOpenCount}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                {nextSignal}
              </p>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                o que esta organizado aqui
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5B6B79]">
                <div>- acao recomendada</div>
                <div>- responsavel definido</div>
                <div>- prazo visivel</div>
                <div>- status acompanhavel</div>
                <div>- observacao de monitoramento</div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                proximo passo
              </div>

              <div className="mt-4 rounded-2xl border border-[#D9E0E7] bg-white p-4">
                <div className="text-sm font-semibold text-[#22313F]">
                  Evidencias e acompanhamento
                </div>
                <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                  Depois do plano de acao, a jornada pode abrir a etapa que mostra trilha, revisoes, historico e acompanhamento das medidas.
                </p>
              </div>

              <Link
                href="/dashboard/nr1/evidencias-acompanhamento"
                className="mt-4 inline-block rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
              >
                Ir para evidencias
              </Link>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}