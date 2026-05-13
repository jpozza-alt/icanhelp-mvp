type Nr1JourneyMode = "cliente_final" | "parceiro_sst" | "pasini_consultoria";

type Nr1JourneyStatusBarProps = {
  mode?: Nr1JourneyMode;
  clientName?: string;
  partnerName?: string;
  establishmentName?: string;
  technicalResponsibleName?: string;
  pgrStatus?: string;
  formalVersionStatus?: string;
  finalApprovalStatus?: string;
  pendingCount?: number;
  completionPercent?: number;
  technicalDetails?: Array<{
    label: string;
    value: string;
  }>;
};

const stages = [
  { key: "entrada", label: "Entrada" },
  { key: "cliente", label: "Cliente" },
  { key: "estabelecimento", label: "Estabelecimento" },
  { key: "diagnostico", label: "Diagnostico" },
  { key: "pgr", label: "PGR" },
  { key: "versao-formal", label: "Versao formal" },
  { key: "aprovacao", label: "Aprovacao" },
];

function clampPercent(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function getModeLabel(mode: Nr1JourneyMode) {
  if (mode === "parceiro_sst") {
    return "Parceiro SST";
  }

  if (mode === "pasini_consultoria") {
    return "Pasini Consultoria";
  }

  return "Cliente final";
}

function getModeDescription(mode: Nr1JourneyMode) {
  if (mode === "parceiro_sst") {
    return "Modo operacional para empresa de medicina e seguranca do trabalho gerenciar clientes atendidos.";
  }

  if (mode === "pasini_consultoria") {
    return "Modo consultivo para conduzir implantacao, revisao tecnica e apoio premium.";
  }

  return "Modo simples para a empresa acompanhar sua propria adequacao NR1.";
}

function getStageState(stageKey: string, activeStage: string) {
  const activeIndex = stages.findIndex((stage) => stage.key === activeStage);
  const stageIndex = stages.findIndex((stage) => stage.key === stageKey);

  if (activeIndex < 0 || stageIndex < 0) {
    return "pending";
  }

  if (stageIndex < activeIndex) {
    return "done";
  }

  if (stageIndex === activeIndex) {
    return "active";
  }

  return "pending";
}

function getDotClassName(state: string) {
  if (state === "done") {
    return "bg-emerald-500 ring-4 ring-emerald-100";
  }

  if (state === "active") {
    return "bg-[#13A3A8] ring-4 ring-[#D6F0F2]";
  }

  return "bg-slate-300 ring-4 ring-slate-100";
}

function getStageTextClassName(state: string) {
  if (state === "done") {
    return "text-emerald-800";
  }

  if (state === "active") {
    return "text-[#0F7B83]";
  }

  return "text-slate-500";
}

export function Nr1JourneyStatusBar({
  mode = "cliente_final",
  clientName = "Cliente atendido nao selecionado",
  partnerName = "Operacao direta",
  establishmentName = "Estabelecimento nao selecionado",
  technicalResponsibleName = "Responsavel tecnico nao definido",
  pgrStatus = "PGR em andamento",
  formalVersionStatus = "Versao formal pendente",
  finalApprovalStatus = "Aprovacao final pendente",
  pendingCount = 0,
  completionPercent = 0,
  technicalDetails = [],
}: Nr1JourneyStatusBarProps) {
  const safePercent = clampPercent(completionPercent);
  const activeStage = safePercent >= 90 ? "aprovacao" : safePercent >= 70 ? "versao-formal" : "pgr";

  return (
    <section className="rounded-[24px] border border-[#D9E0E7] bg-white p-5 shadow-[0_18px_50px_rgba(34,49,63,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#178A8F]">
            jornada NR1 multi-perfil
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[#132238]">Status do caminho ate o PGR formal</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6776]">
            {getModeDescription(mode)}
          </p>
        </div>

        <div className="grid min-w-[220px] gap-3 rounded-2xl border border-[#D9E0E7] bg-[#F8FBFF] p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6776]">modo de uso</p>
            <p className="mt-1 text-sm font-bold text-[#132238]">{getModeLabel(mode)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6776]">progresso</p>
            <p className="mt-1 text-3xl font-extrabold text-[#132238]">{safePercent}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[#13A3A8]" style={{ width: `${safePercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6776]">parceiro ou origem</p>
          <p className="mt-1 text-sm font-bold text-[#132238]">{partnerName}</p>
        </div>

        <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6776]">cliente atendido</p>
          <p className="mt-1 text-sm font-bold text-[#132238]">{clientName}</p>
        </div>

        <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6776]">estabelecimento ativo</p>
          <p className="mt-1 text-sm font-bold text-[#132238]">{establishmentName}</p>
        </div>

        <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6776]">responsavel tecnico</p>
          <p className="mt-1 text-sm font-bold text-[#132238]">{technicalResponsibleName}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-7">
        {stages.map((stage) => {
          const state = getStageState(stage.key, activeStage);

          return (
            <div key={stage.key} className="rounded-2xl border border-[#D9E0E7] bg-white p-3">
              <div className="flex items-center gap-2">
                <span className={"h-2.5 w-2.5 rounded-full " + getDotClassName(state)} />
                <span className={"text-xs font-bold uppercase tracking-wide " + getStageTextClassName(state)}>
                  {state === "done" ? "feito" : state === "active" ? "agora" : "pendente"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#132238]">{stage.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm text-[#132238]">
          <p className="font-bold">PGR</p>
          <p className="mt-1">{pgrStatus}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-bold">Versao formal</p>
          <p className="mt-1">{formalVersionStatus}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-bold">Aprovacao final</p>
          <p className="mt-1">{finalApprovalStatus}</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
          <p className="font-bold">Pendencias</p>
          <p className="mt-1">{pendingCount} item(ns) exigem atencao.</p>
        </div>
      </div>

      {technicalDetails.length > 0 ? (
        <details className="mt-4 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-xs text-[#22313F]">
          <summary className="cursor-pointer font-semibold">Ver detalhes tecnicos</summary>
          <dl className="mt-3 grid gap-2 md:grid-cols-2">
            {technicalDetails.map((item) => (
              <div key={item.label} className="rounded-xl bg-white p-3">
                <dt className="font-semibold uppercase tracking-wide text-[#5B6776]">{item.label}</dt>
                <dd className="mt-1 break-all font-mono">{item.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </section>
  );
}
