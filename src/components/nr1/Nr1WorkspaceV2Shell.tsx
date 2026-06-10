const macroblocks = [
  {
    title: "Preparar base",
    status: "Pronto",
    description: "Empresa, unidade, setor e atividade principal organizados.",
    detail: "Base mínima para iniciar o GRO/PGR.",
  },
  {
    title: "Mapear o trabalho",
    status: "Atual",
    description: "Entender quem trabalha, onde trabalha e como a atividade acontece.",
    detail: "Rotina real, grupo exposto e histórico agregado.",
  },
  {
    title: "Identificar e priorizar riscos",
    status: "Pendente",
    description: "Converter as informações em riscos ocupacionais priorizados.",
    detail: "Inclui fatores psicossociais relacionados ao trabalho.",
  },
  {
    title: "Executar plano de ação",
    status: "Pendente",
    description: "Definir medidas, responsáveis, prazos e acompanhamentos.",
    detail: "Plano preventivo conectado ao inventário.",
  },
  {
    title: "Documentar e acompanhar o PGR",
    status: "Pendente",
    description: "Reunir evidências, revisar e gerar o documento formal.",
    detail: "Rastreabilidade, auditoria e consolidação.",
  },
];

const modules = [
  "Base",
  "Mapeamento",
  "Riscos",
  "Plano",
  "Evidências",
  "PGR",
];

const pendingItems = [
  "Confirmar atividade principal da unidade",
  "Iniciar análise guiada da rotina real",
  "Registrar primeira leitura de risco",
];

export default function Nr1WorkspaceV2Shell() {
  return (
    <main className="min-h-screen bg-[#f4efe7] text-[#10243e]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="border-r border-[#e2d4bf] bg-[#10243e] px-5 py-6 text-white">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d8bd78]">
              icanHelp NR-1
            </p>
            <h1 className="mt-3 text-xl font-semibold tracking-tight">
              Workspace GRO/PGR
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Contexto, progresso e navegação em um painel só.
            </p>
          </div>

          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8bd78]">
              Contexto ativo
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-white/50">Empresa</p>
                <p className="mt-1 font-semibold">TESTE</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Unidade</p>
                <p className="mt-1 font-semibold">UNIDADE TESTE</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Status do PGR</p>
                <p className="mt-1 inline-flex rounded-full bg-[#d8bd78]/15 px-3 py-1 text-xs font-semibold text-[#f4ddb0]">
                  Em construção
                </p>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Progresso macro</p>
              <p className="text-2xl font-semibold text-[#d8bd78]">20%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/5 rounded-full bg-[#d8bd78]" />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/55">
              Base pronta. Próximo foco: mapear a rotina real de trabalho.
            </p>
          </section>

          <nav className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-3">
            {modules.map((module, index) => (
              <a
                key={module}
                href="#"
                className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition ${
                  index === 1
                    ? "bg-white text-[#10243e]"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{module}</span>
                {index === 1 ? <span className="text-xs">Atual</span> : null}
              </a>
            ))}
          </nav>

          <section className="mt-5 rounded-3xl border border-white/10 bg-[#0b1729] p-5">
            <p className="text-sm font-semibold">Trilha completa</p>
            <p className="mt-2 text-xs leading-5 text-white/55">
              16 etapas disponíveis para auditoria e rastreabilidade.
            </p>
            <button className="mt-4 w-full rounded-2xl border border-white/15 px-3 py-2 text-sm font-semibold text-white/80">
              Ver trilha
            </button>
          </section>
        </aside>

        <section className="px-5 py-6 lg:px-8">
          <header className="rounded-[2rem] border border-[#e2d4bf] bg-[#fffaf3] p-6 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9d7b37]">
                  Workspace NR-1
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#10243e]">
                  Decisão guiada para o GRO/PGR
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f665b]">
                  Organize a base, entenda o trabalho real, priorize riscos e acompanhe o PGR sem transformar a tela em formulário técnico.
                </p>
              </div>

              <div className="rounded-3xl border border-[#eadfce] bg-white p-4 xl:w-[320px]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">PGR em construção</p>
                    <p className="mt-1 text-xs text-[#6f665b]">
                      Documento será consolidado a partir dos riscos e evidências.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e9f0e5] px-3 py-1 text-xs font-semibold text-[#2f6f4e]">
                    Seguro
                  </span>
                </div>
                <a
                  href="/dashboard/nr1/relatorio-pgr"
                  className="mt-4 inline-flex rounded-2xl border border-[#10243e] px-4 py-2 text-sm font-semibold text-[#10243e]"
                >
                  Ver resumo do PGR
                </a>
              </div>
            </div>
          </header>

          <section className="mt-6 overflow-hidden rounded-[2rem] border border-[#d8bd78] bg-[#10243e] shadow-lg">
            <div className="grid gap-0 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="p-7 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d8bd78]">
                  Próxima melhor ação
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
                  Mapear a rotina real da atividade principal
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
                  A base inicial está pronta. Agora o sistema deve entender como o trabalho acontece na prática para transformar essa leitura em riscos, prioridades e plano de ação.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/dashboard/nr1/workspace"
                    className="inline-flex justify-center rounded-2xl bg-[#d8bd78] px-5 py-3 text-sm font-bold text-[#10243e]"
                  >
                    Iniciar análise guiada
                  </a>
                  <a
                    href="/dashboard/nr1/workspace"
                    className="inline-flex justify-center rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Revisar base
                  </a>
                </div>
              </div>

              <div className="border-t border-white/10 bg-white/[0.05] p-7 xl:border-l xl:border-t-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d8bd78]">
                  Por que agora?
                </p>
                <div className="mt-4 space-y-4">
                  {[
                    "Empresa, unidade, setor e atividade já existem.",
                    "A próxima decisão depende da rotina real de trabalho.",
                    "O PGR precisa de riscos priorizados e evidências.",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl bg-white/[0.07] p-4 text-sm leading-6 text-white/75">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7b37]">
                  Macroblocos
                </p>
                <h3 className="mt-2 text-2xl font-semibold">A jornada em linguagem humana</h3>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[#6f665b]">
                Os 16 passos continuam existindo para rastreabilidade. O trabalho diário acontece por estes blocos.
              </p>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-5">
              {macroblocks.map((block, index) => (
                <article
                  key={block.title}
                  className={`rounded-3xl border p-5 shadow-sm ${
                    index === 1
                      ? "border-[#d8bd78] bg-[#fffaf3]"
                      : "border-[#e2d4bf] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9d7b37]">
                      0{index + 1}
                    </span>
                    <span className="rounded-full bg-[#f0e7d8] px-3 py-1 text-xs font-semibold text-[#6f4f17]">
                      {block.status}
                    </span>
                  </div>
                  <h4 className="mt-4 text-lg font-semibold">{block.title}</h4>
                  <p className="mt-3 text-sm leading-6 text-[#6f665b]">{block.description}</p>
                  <p className="mt-4 text-xs leading-5 text-[#8a7b6a]">{block.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <article className="rounded-[2rem] border border-[#e2d4bf] bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7b37]">
                Checklist inteligente
              </p>
              <h3 className="mt-2 text-2xl font-semibold">Pendências antes da primeira leitura de risco</h3>
              <div className="mt-5 space-y-3">
                {pendingItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#eee2d2] bg-[#fffaf6] p-4">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#d8bd78]" />
                    <span className="text-sm text-[#4f463c]">{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[#e2d4bf] bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7b37]">
                Módulo atual
              </p>
              <h3 className="mt-2 text-2xl font-semibold">Mapeamento do trabalho</h3>
              <p className="mt-3 text-sm leading-6 text-[#6f665b]">
                A próxima tela deve abrir apenas o formulário necessário para compreender a rotina da atividade, sem exibir todos os cadastros de uma vez.
              </p>
              <a
                href="/dashboard/nr1/workspace"
                className="mt-5 inline-flex rounded-2xl bg-[#10243e] px-5 py-3 text-sm font-semibold text-white"
              >
                Abrir módulo atual
              </a>
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}

