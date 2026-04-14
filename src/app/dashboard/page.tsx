import Link from "next/link";
import AppShell from "@/components/AppShell";

const gainCards = [
  {
    title: "Mais clareza",
    body: "A equipe entende melhor o que precisa fazer, sem depender de jargao tecnico logo na entrada.",
  },
  {
    title: "Menos retrabalho",
    body: "A plataforma organiza o fluxo e deixa o proximo passo visivel, sem espalhar informacao demais.",
  },
  {
    title: "Mais confianca",
    body: "O produto passa a parecer uma solucao pronta, e nao uma tela improvisada de sistema bruto.",
  },
];

export default function DashboardPage() {
  return (
    <AppShell
      active="dashboard"
      title="Painel principal"
      description="Uma entrada clara para orientar o trabalho, reduzir ruido visual e aumentar o valor percebido do icanHelp."
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-[#D9E0E7] bg-white p-7 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            promessa da plataforma
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Organize orientacoes, prioridades e proximos passos em um ambiente que transmite metodo.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            Em vez de parecer um painel tecnico pesado, o icanHelp deve parecer uma solucao de trabalho pronta para apoiar decisao, consistencia e acompanhamento.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/nr1"
              className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
            >
              Abrir modulo NR-1
            </Link>

            <div className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-medium text-[#22313F]">
              Base visual mais humana e mais clara
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            Ganhos imediatos
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {gainCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm"
              >
                <div className="text-lg font-semibold text-[#22313F]">{card.title}</div>
                <p className="mt-3 text-sm leading-7 text-[#5B6B79]">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              o que esta organizado aqui
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[#5B6B79]">
              <div>- entrada principal mais simples</div>
              <div>- navegacao lateral discreta</div>
              <div>- menos blocos por faixa</div>
              <div>- melhor leitura do valor da plataforma</div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#D9E0E7] bg-[#EEF4F8] p-6 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              proximo passo
            </div>
            <div className="mt-3 text-xl font-semibold text-[#22313F]">
              Levar esse mesmo padrao para o diagnostico inicial da NR-1
            </div>
            <p className="mt-3 text-sm leading-7 text-[#5B6B79]">
              A partir daqui, a proxima tela funcional pode nascer com mais clareza, menos ansiedade e melhor narrativa de valor.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}