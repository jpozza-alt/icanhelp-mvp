import PasiniRecruitmentWizard from "../../../components/pasini/PasiniRecruitmentWizard";

const logoPath = "/brand/querino-pasini-logo-idv-transparent.png";

export const metadata = {
  title: "Solicitacao de Analise | Querino & Pasini Consultoria",
  description:
    "Envie um briefing para analise da Querino & Pasini Consultoria. A contratacao sera formalizada somente apos proposta ou ordem de servico assinada via gov.br.",
};

export default function PasiniRecruitmentPage() {
  return (
    <main className="min-h-screen bg-[#101b3b] text-white">
      <section className="relative mx-auto flex w-full max-w-7xl flex-col overflow-hidden px-5 py-6 md:px-8 md:py-10">
        <div className="pointer-events-none absolute -left-28 top-28 h-72 w-72 rounded-full bg-[#AF3800]/30 blur-[90px]" />
        <div className="pointer-events-none absolute right-[-120px] top-16 h-80 w-80 rounded-full bg-[#26428b]/45 blur-[95px]" />
        <div className="pointer-events-none absolute bottom-24 right-20 h-56 w-56 rounded-full bg-[#dcbe7e]/18 blur-[90px]" />

        <header className="relative z-10 flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[#dcbe7e]">
              Querino & Pasini
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-white/45">
              Consultoria
            </p>
          </div>

          <a
            href="#solicitacao"
            className="rounded-full border border-[#dcbe7e]/45 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F2F2F2] transition hover:bg-[#dcbe7e] hover:text-[#101b3b]"
          >
            Iniciar solicitacao
          </a>
        </header>

        <section className="relative z-10 grid min-h-[620px] gap-12 py-12 md:grid-cols-[0.95fr_1.05fr] md:py-16">
          <div className="flex flex-col justify-center">
            <div className="mb-8 h-px w-28 bg-[#dcbe7e]" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/48">
              Solicitacao de analise
            </p>

            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-white md:text-6xl">
              Gestao forte nao acontece por acaso.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-[#F2F2F2]/74 md:text-lg">
              Ela e construida com metodo, estrategia e direcionamento. Este formulario organiza o briefing inicial para analise da consultoria. O envio nao formaliza a contratacao; a contratacao ocorre somente apos proposta ou ordem de servico assinada via gov.br.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="#solicitacao"
                className="rounded-full bg-[#dcbe7e] px-6 py-3 text-sm font-semibold text-[#101b3b] transition hover:bg-[#F2F2F2]"
              >
                Preencher solicitacao
              </a>

              <a
                href="#metodo"
                className="rounded-full border border-white/16 px-6 py-3 text-sm font-semibold text-white/82 transition hover:bg-white/8"
              >
                Ver metodo
              </a>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <img
              src={logoPath}
              alt="Querino & Pasini Consultoria"
              className="h-auto w-full max-w-[620px] object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
            />
          </div>
        </section>

        <section id="metodo" className="relative z-10 grid gap-10 border-y border-white/10 py-10 md:grid-cols-3">
          <div className="pr-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#dcbe7e]">
              01 Estrutura
            </p>
            <p className="mt-4 text-sm leading-7 text-white/70">
              A vaga e registrada com dados objetivos de empresa, area, contexto, requisitos e condicoes.
            </p>
          </div>

          <div className="pr-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#dcbe7e]">
              02 Criterio
            </p>
            <p className="mt-4 text-sm leading-7 text-white/70">
              O perfil desejado fica mais claro antes da conversa consultiva e reduz retrabalho.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#dcbe7e]">
              03 Continuidade
            </p>
            <p className="mt-4 text-sm leading-7 text-white/70">
              A equipe Querino & Pasini recebe um ponto de partida organizado para conduzir a analise.
            </p>
          </div>
        </section>

        <section id="solicitacao" className="relative z-10 grid gap-9 py-12 md:grid-cols-[0.72fr_1.28fr] md:py-16">
          <aside className="flex flex-col justify-between border-l border-[#dcbe7e]/55 pl-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#dcbe7e]">
                Solicitacao guiada
              </p>

              <h2 className="mt-5 max-w-md text-3xl font-semibold leading-tight text-white md:text-4xl">
                Um fluxo simples, com presenca visual de marca premium.
              </h2>

              <p className="mt-6 max-w-md text-sm leading-8 text-white/68">
                Sem excesso de cards, sem moldura na logo e com uso controlado das cores da identidade visual:
                azul profundo, dourado principal, terracota profundo, cinza claro e branco.
              </p>
            </div>

            <div className="mt-10 space-y-5">
              <div className="h-px w-full bg-white/10" />
              <p className="text-xs leading-6 text-white/50">
                Dados tratados para fins de Solicitacao de analise. O envio da solicitacao nao substitui
                a conversa consultiva posterior.
              </p>
            </div>
          </aside>

          <PasiniRecruitmentWizard />
        </section>
      </section>
    </main>
  );
}



