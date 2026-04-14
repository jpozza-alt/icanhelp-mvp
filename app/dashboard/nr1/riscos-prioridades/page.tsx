"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type RiskFormState = {
  sectorName: string;
  hazardTitle: string;
  hazardDescription: string;
  sourceOrCircumstance: string;
  exposedGroup: string;
  possibleEffects: string;
  severity: string;
  probability: string;
};

type RiskItem = RiskFormState & {
  id: string;
  score: number;
  priority: string;
  immediateAction: boolean;
};

const initialForm: RiskFormState = {
  sectorName: "",
  hazardTitle: "",
  hazardDescription: "",
  sourceOrCircumstance: "",
  exposedGroup: "",
  possibleEffects: "",
  severity: "",
  probability: "",
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

function getPriority(score: number) {
  if (score >= 20) return "muito alta";
  if (score >= 12) return "alta";
  if (score >= 6) return "media";
  return "baixa";
}

function getPriorityClass(priority: string) {
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

export default function Nr1RiscosPrioridadesPage() {
  const [form, setForm] = useState<RiskFormState>(initialForm);
  const [items, setItems] = useState<RiskItem[]>([]);

  function updateField<K extends keyof RiskFormState>(field: K, value: RiskFormState[K]) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
  }

  function handleAddRisk() {
    if (
      !form.sectorName ||
      !form.hazardTitle.trim() ||
      !form.hazardDescription.trim() ||
      !form.exposedGroup.trim() ||
      !form.possibleEffects.trim() ||
      !form.severity ||
      !form.probability
    ) {
      return;
    }

    const severityNumber = Number(form.severity);
    const probabilityNumber = Number(form.probability);
    const score = severityNumber * probabilityNumber;
    const priority = getPriority(score);
    const immediateAction = priority === "muito alta";

    const nextItem: RiskItem = {
      ...form,
      id: crypto.randomUUID(),
      score,
      priority,
      immediateAction,
    };

    setItems((old) => [...old, nextItem]);
    resetForm();
  }

  function handleRemoveRisk(id: string) {
    setItems((old) => old.filter((item) => item.id !== id));
  }

  const urgentCount = useMemo(
    () => items.filter((item) => item.immediateAction).length,
    [items]
  );

  const nextSignal = useMemo(() => {
    if (items.length === 0) {
      return "Cadastre pelo menos um risco para gerar leitura de prioridade e necessidade de acao.";
    }

    if (urgentCount > 0) {
      return "Ha risco com acao imediata sugerida. A proxima etapa deve abrir o plano de acao com prioridade maxima.";
    }

    return "Base de riscos pronta para abrir o plano de acao da empresa.";
  }, [items.length, urgentCount]);

  return (
    <AppShell
      active="nr1"
      title="Riscos e prioridades"
      description="Terceira etapa da jornada. Aqui o sistema transforma perigo, grupo exposto, gravidade e probabilidade em prioridade de acao."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Traduz o trabalho real em risco, prioridade e necessidade de resposta.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            Aqui a jornada deixa de olhar apenas a estrutura e passa a registrar perigo, grupo exposto, possiveis agravamentos e nivel de prioridade. Isso prepara a abertura do plano de acao.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                registrar risco
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
                    Grupo exposto
                  </label>
                  <input
                    value={form.exposedGroup}
                    onChange={(e) => updateField("exposedGroup", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: equipe de atendimento"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Perigo ou risco principal
                  </label>
                  <input
                    value={form.hazardTitle}
                    onChange={(e) => updateField("hazardTitle", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: sobrecarga de trabalho"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Descricao do que esta acontecendo
                  </label>
                  <textarea
                    value={form.hazardDescription}
                    onChange={(e) => updateField("hazardDescription", e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
                    placeholder="Ex.: equipe acumulando demandas, prazos curtos e interrupcoes frequentes"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Fonte ou circunstancia
                  </label>
                  <input
                    value={form.sourceOrCircumstance}
                    onChange={(e) => updateField("sourceOrCircumstance", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: aumento de demanda, equipe reduzida, rotina fragmentada"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Possiveis agravamentos ou efeitos
                  </label>
                  <input
                    value={form.possibleEffects}
                    onChange={(e) => updateField("possibleEffects", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: estresse, esgotamento, queda de desempenho"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Severidade
                  </label>
                  <select
                    value={form.severity}
                    onChange={(e) => updateField("severity", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    <option value="1">1 - leve</option>
                    <option value="2">2 - menor</option>
                    <option value="3">3 - moderada</option>
                    <option value="4">4 - maior</option>
                    <option value="5">5 - maxima</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Probabilidade
                  </label>
                  <select
                    value={form.probability}
                    onChange={(e) => updateField("probability", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione</option>
                    <option value="1">1 - muito improvavel</option>
                    <option value="2">2 - pouco provavel</option>
                    <option value="3">3 - possivel</option>
                    <option value="4">4 - provavel</option>
                    <option value="5">5 - muito provavel</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAddRisk}
                  className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
                >
                  Adicionar risco
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
                riscos registrados
              </div>

              {items.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Nenhum risco registrado ainda.
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
                            risco {index + 1}
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                            {item.hazardTitle}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                            {item.hazardDescription}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRisk(item.id)}
                          className="rounded-xl border border-[#E3C7CB] bg-[#F9F1F2] px-4 py-2 text-sm font-semibold text-[#8A4F58]"
                        >
                          Remover
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Setor: {item.sectorName}
                        </div>
                        <div className={"rounded-full border px-3 py-2 text-xs font-semibold " + getPriorityClass(item.priority)}>
                          Prioridade: {item.priority}
                        </div>
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Score: {item.score}
                        </div>
                        <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#22313F]">
                          Grupo: {item.exposedGroup}
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
                leitura automatica
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    riscos cadastrados
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {items.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5E7A96]">
                    acao imediata sugerida
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#22313F]">
                    {urgentCount}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                {nextSignal}
              </p>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                como a prioridade nasce
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5B6B79]">
                <div>- severidade x probabilidade</div>
                <div>- score de 1 a 25</div>
                <div>- baixa, media, alta ou muito alta</div>
                <div>- risco muito alto acende necessidade de resposta imediata</div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                proximo passo
              </div>

              <div className="mt-4 rounded-2xl border border-[#D9E0E7] bg-white p-4">
                <div className="text-sm font-semibold text-[#22313F]">
                  Plano de acao
                </div>
                <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                  Depois de registrar os riscos, a jornada ja pode abrir a tela que transforma prioridade em responsavel, prazo e acompanhamento.
                </p>
              </div>

              <Link
                href="/dashboard/nr1/plano-acao"
                className="mt-4 inline-block rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
              >
                Ir para plano de acao
              </Link>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}