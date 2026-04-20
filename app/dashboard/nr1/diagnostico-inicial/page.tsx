import Link from "next/link";

const nextActions = [
  {
    title: "Mapear setores e atividades",
    text: "Organize a base operacional da empresa antes de aprofundar os riscos.",
    href: "/dashboard/nr1/setores",
    tag: "proximo passo",
  },
  {
    title: "Ir para riscos e prioridades",
    text: "Acesse a leitura dos riscos para revisar prioridades e encaminhamentos.",
    href: "/dashboard/nr1/riscos",
    tag: "analise",
  },
  {
    title: "Abrir plano de acao",
    text: "Veja a etapa de execucao e acompanhamento das medidas planejadas.",
    href: "/dashboard/nr1/plano-de-acao",
    tag: "execucao",
  },
];

const summaryCards = [
  { value: "Acesso ok", label: "usuario autenticado" },
  { value: "NR-1", label: "jornada ativa" },
  { value: "3", label: "caminhos rapidos" },
  { value: "1", label: "entrada oficial" },
];

const checkpoints = [
  "Confirmar o contexto da empresa e dos estabelecimentos.",
  "Mapear setores e atividades com linguagem simples.",
  "Transformar a leitura do cenario em riscos e prioridades.",
  "Encaminhar a execucao para plano de acao e evidencias.",
];

export default function Nr1DiagnosticoInicialPage() {
  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#132238]">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0F2337_0%,#13495C_60%,#178A8F_100%)] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
          <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">area autenticada</div>
          <h1 className="mt-4 text-[38px] font-semibold leading-tight">Diagnostico inicial da jornada NR-1</h1>
          <p className="mt-3 max-w-[760px] text-base leading-7 text-white/85">
            Voce entrou na area real do modulo. A partir daqui, a jornada deixa de ser vitrine e passa a orientar a execucao do trabalho com contexto, etapas e encaminhamentos claros.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/nr1/setores"
              className="rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
            >
              Comecar pelos setores
            </Link>
            <Link
              href="/dashboard/nr1"
              className="rounded-[14px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Voltar para a vitrine
            </Link>
          </div>
        </section>

        <section className="mt-[18px] grid gap-[18px] md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <div
              key={item.label}
              className="grid gap-2 rounded-[20px] border border-[#DBE5F0] bg-[linear-gradient(180deg,#FFFFFF,#F8FBFF)] p-[18px] shadow-[0_10px_30px_rgba(18,40,70,0.08)]"
            >
              <div className="text-[28px] font-extrabold">{item.value}</div>
              <div className="text-[13px] text-[#60718A]">{item.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-[18px] grid gap-[18px] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">O que esta liberado agora</h2>
              <span className="rounded-full border border-[#C8F0DA] bg-[#EBFBF3] px-[10px] py-[7px] text-xs font-bold text-[#20865A]">
                execucao real
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#60718A]">
              Esta tela marca o inicio da area autenticada da jornada. O objetivo aqui e organizar o caminho para a coleta inicial, o mapeamento dos setores e a leitura das prioridades da empresa.
            </p>

            <div className="mt-5 rounded-[18px] border border-[#DBE5F0] bg-[#F8FBFF] p-5">
              <div className="text-sm font-semibold text-[#132238]">Checkpoints desta etapa</div>
              <ul className="mt-3 grid gap-2 text-sm leading-7 text-[#60718A]">
                {checkpoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Leitura executiva</h2>
              <span className="rounded-full border border-[#FFE3AA] bg-[#FFF8EA] px-[10px] py-[7px] text-xs font-bold text-[#C88A16]">
                orientacao
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#60718A]">
              Antes de aprofundar riscos, a recomendacao e consolidar empresa, estabelecimentos, setores e atividades. Isso evita que a jornada vire um formulario solto e melhora a qualidade da leitura posterior.
            </p>

            <div className="mt-5 inline-flex rounded-full border border-[#C7EEEE] bg-[#E7F7F7] px-[10px] py-[7px] text-xs font-bold text-[#0F7B83]">
              ponto de entrada operacional da jornada
            </div>
          </div>
        </section>

        <section className="mt-[18px] grid gap-[18px] xl:grid-cols-3">
          {nextActions.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]"
            >
              <div className="inline-flex rounded-full border border-[#DBE5F0] bg-[#F8FBFF] px-[10px] py-[7px] text-xs font-bold text-[#60718A]">
                {item.tag}
              </div>
              <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#60718A]">{item.text}</p>
              <Link
                href={item.href}
                className="mt-5 inline-flex rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
              >
                Abrir etapa
              </Link>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
