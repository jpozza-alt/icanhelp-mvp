import Link from "next/link";
import AppShell from "@/components/AppShell";

const steps = [
  "Entender a empresa e o contexto de trabalho",
  "Mapear setores, atividades e exposicoes",
  "Classificar riscos e priorizar o que exige resposta",
  "Montar plano de acao e blindar a execucao",
  "Consolidar evidencias reais por estabelecimento",
  "Acompanhar action-plans com trilha propria de followups",
];

const outputCards = [
  {
    title: "Diagnostico inicial",
    body: "A empresa enxerga rapidamente onde precisa olhar primeiro.",
  },
  {
    title: "Prioridades claras",
    body: "O sistema mostra o que merece atencao antes de virar documento tecnico.",
  },
  {
    title: "Base de evidencias",
    body: "A jornada guiada prepara o terreno para trilha, revisao e acompanhamento.",
  },
];

export default function Nr1HomePage() {
  return (
    <AppShell
      active="nr1"
      title="Adequacao NR-1 da sua empresa"
      description="Uma jornada guiada para transformar exigencia normativa em diagnostico, prioridades e plano de acao com linguagem clara."
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-[#D9E0E7] bg-white p-7 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o pacote da solucao
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Organize riscos, prioridades e plano de acao sem depender de linguagem tecnica na primeira conversa.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            O cliente nao precisa entrar por AEP, AET, GRO ou PGR. Ele entra por uma promessa clara: entender a realidade da empresa, identificar o que importa e sair com caminho de acao.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/nr1/diagnostico-inicial"
              className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
            >
              Comecar diagnostico
            </Link>

            <div className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-medium text-[#22313F]">
              Menos medo da norma, mais clareza do trabalho
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              como a jornada conduz
            </div>
            <div className="mt-4 space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-4 rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] px-4 py-4"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF4F8] text-sm font-semibold text-[#5E7A96]">
                    {index + 1}
                  </div>
                  <div className="pt-1 text-sm leading-6 text-[#22313F]">{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              O que sai pronto daqui
            </div>
            <div className="mt-4 space-y-4">
              {outputCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-[#D9E0E7] bg-white p-4"
                >
                  <div className="text-sm font-semibold text-[#22313F]">{card.title}</div>
                  <p className="mt-2 text-sm leading-7 text-[#5B6B79]">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            por que isso convence melhor
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-[#5B6B79]">
            Porque a tela deixa de vender tecnologia e passa a vender resultado percebido: entendimento, ordem, seguranca e proximo passo. Isso aproxima o icanHelp de uma consultoria apoiada por SaaS, e nao de um sistema frio que despeja campo e jargao.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

