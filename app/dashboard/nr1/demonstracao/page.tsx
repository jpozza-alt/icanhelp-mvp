import Link from "next/link";

const executionHref = "/login?next=%2Fdashboard%2Fnr1%2Fworkspace";

const sections = [
  { title: "Boas-vindas", text: "Abertura da jornada em linguagem simples, com foco em valor e proxima acao." },
  { title: "Triagem", text: "Onboarding rapido para entender porte, exposicoes e foco da analise." },
  { title: "Setores e atividades", text: "Base operacional da jornada, sem depender de cargo generico." },
  { title: "Diagnostico guiado", text: "Perguntas humanas que viram riscos, prioridades e trilha documental." },
  { title: "Plano de acao", text: "Risco vira execucao com responsavel, prazo, acompanhamento e evidencia." },
  { title: "Evidencias e revisoes", text: "Prova documental, historico e revisao por marcos relevantes." },
];

export default function Nr1DemonstracaoPage() {
  return (
    <main className="min-h-screen bg-[#F7F3EC] text-[#10243E]">
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <section className="overflow-hidden rounded-[28px] border border-[#D6B56C] bg-[#10243E] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">demonstracao publica</div>
          <h1 className="mt-4 text-[32px] font-semibold leading-tight">Visao demonstrativa da jornada NR-1</h1>
          <p className="mt-3 max-w-[760px] text-base leading-7 text-white/85">
            Esta rota mostra a narrativa de uso do modulo sem depender de autenticacao e sem gravar dados reais.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard/nr1" className="rounded-[14px] border border-white/20 bg-[#FFFCF7]/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#FFFCF7]/15">Voltar para a pagina inicial</Link>
            <Link href={executionHref} className="rounded-[14px] bg-[#10243E] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,36,62,0.18)] transition hover:-translate-y-[1px]">Entrar para executar</Link>
          </div>
        </section>

        <section className="mt-[18px] grid gap-[18px] lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[24px] bg-[#10243E] p-5 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">etapas demonstradas</div>
            <div className="mt-3 grid gap-2">
              {sections.map((item, index) => (
                <div key={item.title} className="flex items-center justify-between rounded-[14px] px-3 py-3 text-sm text-[#F4ECE2]">
                  <span className="flex items-center gap-3">
                    <span className={index === 0 ? "h-[9px] w-[9px] rounded-full bg-[#D6B56C]" : "h-[9px] w-[9px] rounded-full bg-[#FFFCF7]/25"} />
                    <span>{item.title}</span>
                  </span>
                  <span className="text-xs opacity-60">{String(index + 1).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-3">
            {sections.map((item) => (
              <section key={item.title} className="rounded-[24px] border border-[#E2D4BF] bg-[#FFFCF7] p-5 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                <div className="text-[12px] uppercase tracking-[0.08em] text-[#60718A]">etapa da demonstracao</div>
                <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#60718A]">{item.text}</p>
                <div className="mt-4 inline-flex rounded-full border border-[#D6B56C] bg-[#FFF8EA] px-[10px] py-[7px] text-xs font-bold text-[#8B5E34]">leitura guiada</div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

