"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type SectorFormState = {
  sectorName: string;
  mainActivity: string;
  workerCount: string;
  routineShift: string;
  publicService: string;
  goalsPressure: string;
  repetitiveWork: string;
  seatedWork: string;
  physicalEffort: string;
  machineNoiseHeatChemical: string;
};

type SectorItem = SectorFormState & {
  id: string;
};

const initialForm: SectorFormState = {
  sectorName: "",
  mainActivity: "",
  workerCount: "",
  routineShift: "",
  publicService: "",
  goalsPressure: "",
  repetitiveWork: "",
  seatedWork: "",
  physicalEffort: "",
  machineNoiseHeatChemical: "",
};

const inputClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]";
const selectClassName =
  "w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";
const sectionClassName = "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm";

function yesNoOptions() {
  return (
    <>
      <option value="">Selecione</option>
      <option value="yes">Sim</option>
      <option value="no">Nao</option>
      <option value="partially">Em parte</option>
      <option value="unknown">Ainda nao sei</option>
    </>
  );
}

export default function Nr1MapeamentoSetoresPage() {
  const [form, setForm] = useState<SectorFormState>(initialForm);
  const [items, setItems] = useState<SectorItem[]>([]);

  function updateField<K extends keyof SectorFormState>(field: K, value: SectorFormState[K]) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
  }

  function handleAddSector() {
    if (!form.sectorName.trim() || !form.mainActivity.trim()) {
      return;
    }

    const nextItem: SectorItem = {
      ...form,
      id: crypto.randomUUID(),
    };

    setItems((old) => [...old, nextItem]);
    resetForm();
  }

  function handleRemoveSector(id: string) {
    setItems((old) => old.filter((item) => item.id !== id));
  }

  const readyForNextStep = useMemo(() => items.length > 0, [items.length]);

  const summaryText = useMemo(() => {
    if (items.length === 0) {
      return "Cadastre pelo menos um setor para preparar a etapa de identificacao de riscos e prioridades.";
    }

    return "Base inicial de setores pronta. A proxima etapa ja pode ler atividades, grupos expostos e sinais prioritarios.";
  }, [items.length]);

  const earlySignals = useMemo(() => {
    const signals: string[] = [];

    for (const item of items) {
      if (item.publicService === "yes") {
        signals.push(item.sectorName + ": atendimento ao publico pode elevar pressao e desgaste.");
      }

      if (item.goalsPressure === "yes") {
        signals.push(item.sectorName + ": metas e cobranca frequente pedem atencao para fatores psicossociais.");
      }

      if (item.repetitiveWork === "yes") {
        signals.push(item.sectorName + ": trabalho repetitivo sugere revisao ergonomica.");
      }

      if (item.seatedWork === "yes") {
        signals.push(item.sectorName + ": trabalho sentado prolongado pede observacao de postura e pausas.");
      }

      if (item.physicalEffort === "yes") {
        signals.push(item.sectorName + ": esforco fisico pode exigir detalhamento de movimentacao e sobrecarga.");
      }

      if (item.machineNoiseHeatChemical === "yes") {
        signals.push(item.sectorName + ": ha indicio de perigos operacionais para detalhar no proximo passo.");
      }
    }

    return signals;
  }, [items]);

  return (
    <AppShell
      active="nr1"
      title="Mapeamento de setores e atividades"
      description="Segunda etapa da jornada. Aqui a empresa organiza a estrutura real do trabalho antes de entrar na identificacao de riscos."
    >
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Transforma a empresa em setores, atividades e grupos observaveis.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            O objetivo aqui nao e discutir norma. E criar uma estrutura simples para que o sistema consiga enxergar onde o trabalho acontece, quem esta exposto e que tipo de atencao cada setor pode exigir.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                cadastrar setor
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Nome do setor
                  </label>
                  <input
                    value={form.sectorName}
                    onChange={(e) => updateField("sectorName", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: atendimento"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Quantidade aproximada de pessoas
                  </label>
                  <input
                    value={form.workerCount}
                    onChange={(e) => updateField("workerCount", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: 6"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Atividade principal do setor
                  </label>
                  <input
                    value={form.mainActivity}
                    onChange={(e) => updateField("mainActivity", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: atendimento a clientes e organizacao de demandas"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Turno ou rotina predominante
                  </label>
                  <input
                    value={form.routineShift}
                    onChange={(e) => updateField("routineShift", e.target.value)}
                    className={inputClassName}
                    placeholder="Ex.: horario comercial, revezamento, rotina externa"
                  />
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                sinais do trabalho nesse setor
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha atendimento ao publico
                  </label>
                  <select
                    value={form.publicService}
                    onChange={(e) => updateField("publicService", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha pressao por metas ou prazo
                  </label>
                  <select
                    value={form.goalsPressure}
                    onChange={(e) => updateField("goalsPressure", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha trabalho repetitivo
                  </label>
                  <select
                    value={form.repetitiveWork}
                    onChange={(e) => updateField("repetitiveWork", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha trabalho predominantemente sentado
                  </label>
                  <select
                    value={form.seatedWork}
                    onChange={(e) => updateField("seatedWork", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha esforco fisico relevante
                  </label>
                  <select
                    value={form.physicalEffort}
                    onChange={(e) => updateField("physicalEffort", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#22313F]">
                    Ha maquina, ruido, calor ou quimico
                  </label>
                  <select
                    value={form.machineNoiseHeatChemical}
                    onChange={(e) => updateField("machineNoiseHeatChemical", e.target.value)}
                    className={selectClassName}
                  >
                    {yesNoOptions()}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAddSector}
                  className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
                >
                  Adicionar setor
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
                setores cadastrados
              </div>

              {items.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Nenhum setor cadastrado ainda.
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
                            setor {index + 1}
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                            {item.sectorName}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                            {item.mainActivity}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSector(item.id)}
                          className="rounded-xl border border-[#E3C7CB] bg-[#F9F1F2] px-4 py-2 text-sm font-semibold text-[#8A4F58]"
                        >
                          Remover
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-[#E6ECF1] bg-white px-4 py-3 text-sm text-[#5B6B79]">
                          <span className="font-semibold text-[#22313F]">Pessoas:</span> {item.workerCount || "nao informado"}
                        </div>
                        <div className="rounded-xl border border-[#E6ECF1] bg-white px-4 py-3 text-sm text-[#5B6B79]">
                          <span className="font-semibold text-[#22313F]">Rotina:</span> {item.routineShift || "nao informado"}
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
                progresso desta etapa
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[#5B6B79]">Setores estruturados</span>
                  <span className="font-semibold text-[#22313F]">{items.length}</span>
                </div>

                <div className="h-3 rounded-full bg-[#E9EEF3]">
                  <div
                    className="h-3 rounded-full bg-[#5E7A96]"
                    style={{ width: (items.length === 0 ? 8 : Math.min(100, items.length * 25)) + "%" }}
                  />
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                {summaryText}
              </p>
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                o que isso prepara
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5B6B79]">
                <div>- grupos expostos por setor</div>
                <div>- atividades que exigem observacao</div>
                <div>- sinais iniciais para risco ergonomico, psicossocial e operacional</div>
                <div>- base para a classificacao de prioridades</div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                sinais iniciais por setor
              </div>

              {earlySignals.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
                  Conforme voce cadastrar os setores, o sistema passa a destacar pontos que podem merecer atencao mais cedo.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {earlySignals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-2xl border border-[#D9E0E7] bg-white px-4 py-4 text-sm leading-7 text-[#5B6B79]"
                    >
                      {signal}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={sectionClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                proximo passo
              </div>

              <div className="mt-4 rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                <div className="text-sm font-semibold text-[#22313F]">
                  Identificacao de riscos e prioridades
                </div>
                <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                  Depois de estruturar os setores, a jornada consegue abrir a tela que transforma atividade e exposicao em risco, prioridade e necessidade de acao.
                </p>
              </div>

              <Link
                href="/dashboard/nr1/riscos-prioridades"
                className={
                  readyForNextStep
                    ? "mt-4 inline-block rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
                    : "mt-4 inline-block rounded-xl bg-[#C8D5E2] px-5 py-3 text-sm font-semibold text-white"
                }
              >
                Ir para riscos e prioridades
              </Link>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}