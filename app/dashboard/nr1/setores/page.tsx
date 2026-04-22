import Link from "next/link";

import Nr1WorkspaceContextBar from '../../../../src/components/nr1/Nr1WorkspaceContextBar';
const sectorCards = [
  {
    title: "Administrativo",
    text: "Consolidar rotinas, exposicoes e interfaces internas para montar a base do levantamento.",
    tag: "apoio",
  },
  {
    title: "Operacional",
    text: "Registrar as atividades principais e os pontos onde a leitura de risco vai precisar aprofundar.",
    tag: "critico",
  },
  {
    title: "Atividades externas",
    text: "Separar frentes com deslocamento, atendimento externo ou execucao fora da base fixa.",
    tag: "campo",
  },
];

const checkpoints = [
  "Separar setores por realidade de trabalho, e nao apenas por organograma.",
  "Descrever atividades com linguagem simples antes de falar em risco.",
  "Evitar juntar contextos muito diferentes em um mesmo bloco operacional.",
  "Preparar a base para a leitura de riscos e prioridades na etapa seguinte.",
];

const quickActions = [
  {
    title: "Voltar ao diagnostico inicial",
    href: "/dashboard/nr1/diagnostico-inicial",
    text: "Retorne ao ponto de entrada autenticado da jornada.",
  },
  {
    title: "Seguir para riscos",
    href: "/dashboard/nr1/riscos",
    text: "Abra a proxima etapa para revisar riscos e prioridades.",
  },
  {
    title: "Abrir plano de acao",
    href: "/dashboard/nr1/plano-de-acao",
    text: "Veja a frente de encaminhamentos e acompanhamento.",
  },
];

export default function Nr1SetoresPage() {
  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#132238]">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0F2337_0%,#13495C_60%,#178A8F_100%)] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
          <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">etapa operacional</div>
          <h1 className="mt-4 text-[38px] font-semibold leading-tight">Setores e atividades</h1>
          <p className="mt-3 max-w-[760px] text-base leading-7 text-white/85">
            Esta etapa organiza a estrutura real de trabalho da empresa. O objetivo aqui nao e burocratizar o fluxo, e sim montar uma base clara para que a analise de riscos faca sentido depois.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/nr1/riscos"
              className="rounded-[14px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px]"
            >
              Seguir para riscos
            </Link>
            <Link
              href="/dashboard/nr1/diagnostico-inicial"
              className="rounded-[14px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Voltar ao diagnostico
            </Link>
          </div>
        </section>

        <Nr1WorkspaceContextBar />

        <section className="mt-[18px] grid gap-[18px] xl:grid-cols-3">
          {sectorCards.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]"
            >
              <div className="inline-flex rounded-full border border-[#DBE5F0] bg-[#F8FBFF] px-[10px] py-[7px] text-xs font-bold text-[#60718A]">
                {item.tag}
              </div>
              <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#60718A]">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-[18px] grid gap-[18px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Como pensar esta etapa</h2>
              <span className="rounded-full border border-[#C8F0DA] bg-[#EBFBF3] px-[10px] py-[7px] text-xs font-bold text-[#20865A]">
                base operacional
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#60718A]">
              Setores e atividades precisam representar o trabalho real. Quando essa base e montada direito, a etapa de riscos deixa de ser abstrata e passa a conversar com a rotina concreta da empresa.
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
                organizacao
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#60718A]">
              O fluxo antigo desta rota foi removido aqui para evitar loop de guarda. Esta tela agora funciona como etapa operacional direta da jornada, no mesmo baseline visual das telas novas.
            </p>

            <div className="mt-5 inline-flex rounded-full border border-[#C7EEEE] bg-[#E7F7F7] px-[10px] py-[7px] text-xs font-bold text-[#0F7B83]">
              sem guard antigo nesta etapa
            </div>
          </div>
        </section>

        <section className="mt-[18px] grid gap-[18px] xl:grid-cols-3">
          {quickActions.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]"
            >
              <h2 className="text-xl font-semibold">{item.title}</h2>
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
