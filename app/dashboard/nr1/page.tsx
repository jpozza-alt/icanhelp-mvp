import Link from "next/link";

const executionHref = "/login?next=%2Fdashboard%2Fnr1%2Fworkspace";
const demoHref = "/dashboard/nr1/demonstracao";

const steps = [
  "Boas-vindas",
  "Triagem",
  "Empresa",
  "Estabelecimentos",
  "Setores e Atividades",
  "Diagnóstico Guiado",
  "Riscos",
  "Plano de Acao",
];

const principles = [
  "jornada guiada",
  "sidebar fixa enxuta",
  "autosave obrigatorio",
  "versao por marcos",
  "trilha obrigatoria",
  "linguagem leiga na frente",
];

const pillars = [
  { title: "Execucao real", text: "Entrada autenticada para operar a jornada com sessao, tenant e persistencia real." },
  { title: "Demonstracao guiada", text: "Rota publica para apresentar a experiencia sem depender de login e sem gravar dados reais." },
  { title: "Mensagem correta", text: "A pagina inicial assume papel de vitrine e separa demonstracao de uso operacional." },
];

const highlights = [
  { value: "62%", label: "estrutura principal pronta" },
  { value: "8", label: "etapas principais" },
  { value: "3", label: "pendencias urgentes" },
  { value: "2", label: "caminhos de entrada" },
];

export default function Nr1LandingPage() {
  return (
    <main className="min-h-screen bg-[#F7F3EC] text-[#10243E]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="bg-[#10243E] px-5 py-6 text-white xl:sticky xl:top-0 xl:min-h-screen">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#D6B56C] text-sm font-extrabold text-[#10243E] shadow-[0_8px_18px_rgba(16,36,62,0.24)]">iC</div>
            <div>
              <div className="text-[18px] font-semibold leading-[1.1]">icanHelp</div>
              <div className="mt-1 text-xs text-white/70">Jornada NR-1</div>
            </div>
          </div>

          <div className="mt-6 rounded-[18px] border border-white/10 bg-[#FFFCF7]/5 p-4 backdrop-blur">
            <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">progresso geral</div>
            <div className="mt-2 text-[28px] font-extrabold">62%</div>
            <div className="mt-1 text-[13px] text-white/75">estrutura principal pronta</div>
            <div className="mt-3 h-[10px] overflow-hidden rounded-full bg-[#FFFCF7]/10">
              <div className="h-full w-[62%] rounded-full bg-[#D6B56C]" />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] text-white/70">
              <span>8 setores avaliados</span>
              <span>3 alertas</span>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-[#FFFCF7]/5 p-4 backdrop-blur">
            <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">etapas da jornada</div>
            <div className="mt-3 grid gap-2">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center justify-between rounded-[14px] px-3 py-3 text-sm text-[#F4ECE2]"
                >
                  <span className="flex items-center gap-3">
                    <span className={index === 0 ? "h-[9px] w-[9px] rounded-full bg-[#D6B56C]" : "h-[9px] w-[9px] rounded-full bg-[#FFFCF7]/25"} />
                    <span>{step}</span>
                  </span>
                  <span className="text-xs opacity-60">{String(index + 1).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-[#FFFCF7]/5 p-4 backdrop-blur">
            <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">decisoes de ux</div>
            <div className="mt-3 grid gap-2 text-[13px] text-[#F4ECE2]">
              {principles.map((item) => (
                <div key={item}>- {item}</div>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-[#E2D4BF] bg-[rgba(247,243,236,0.92)] px-6 py-[18px] backdrop-blur-[16px]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E2D4BF] bg-[#FFFCF7] px-[14px] py-[10px] text-sm shadow-[0_10px_30px_rgba(18,40,70,0.08)]"><span className="h-2 w-2 rounded-full bg-[#D6B56C]" /> Pasini Consultoria</div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E2D4BF] bg-[#FFFCF7] px-[14px] py-[10px] text-sm shadow-[0_10px_30px_rgba(18,40,70,0.08)]"><span className="h-2 w-2 rounded-full bg-[#D6B56C]" /> Estabelecimento Matriz</div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E2D4BF] bg-[#FFFCF7] px-[14px] py-[10px] text-sm shadow-[0_10px_30px_rgba(18,40,70,0.08)]"><span className="h-2 w-2 rounded-full bg-[#A36B16]" /> 3 pendencias urgentes</div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E2D4BF] bg-[#FFFCF7] px-[14px] py-[10px] text-sm shadow-[0_10px_30px_rgba(18,40,70,0.08)]"><span className="h-2 w-2 rounded-full bg-[#20865A]" /> Salvo agora as 09:42</div>
              <Link href={demoHref} className="rounded-[14px] border border-[#E2D4BF] bg-[#FFFCF7] px-4 py-3 text-sm font-semibold transition hover:bg-[#F4ECE2]">Ajuda visual</Link>
              <Link href={executionHref} className="rounded-[14px] bg-[#10243E] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,36,62,0.18)] transition hover:-translate-y-[1px]">Entrar para executar</Link>
            </div>
          </div>

          <div className="px-6 pt-6">
            <section className="rounded-[24px] border border-[#E2D4BF] bg-[#FFFCF7] p-5 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.08em] text-[#60718A]">status da jornada</div>
                  <h2 className="mt-2 text-xl font-semibold text-[#10243E]">Ambiente publico de apresentacao</h2>
                  <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#60718A]">
                    O status operacional aparece somente apos autenticacao, com tenant e estabelecimento resolvidos pela sessao.
                  </p>
                </div>
                <div className="grid gap-2 rounded-[18px] border border-[#E2D4BF] bg-[#F4ECE2] px-4 py-3 text-sm text-[#60718A]">
                  <span className="font-semibold text-[#10243E]">Sem contexto real carregado</span>
                  <span>Use demonstracao ou entrada autenticada para continuar.</span>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-[18px] p-6">
            <section className="overflow-hidden rounded-[28px] border border-[#D6B56C] bg-[#10243E] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
              <h1 className="text-[32px] font-semibold leading-tight">Adequacao NR-1 da sua empresa</h1>
              <p className="mt-3 max-w-[760px] text-base leading-7 text-white/85">
                O usuário não entra em um formulário técnico. Ele entra em uma jornada guiada que transforma respostas simples em riscos, prioridades, ações, documentos e trilha de evidências.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={executionHref} className="rounded-[14px] bg-[#10243E] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,36,62,0.18)] transition hover:-translate-y-[1px]">Entrar para executar</Link>
                <Link href={demoHref} className="rounded-[14px] border border-white/20 bg-[#FFFCF7]/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#FFFCF7]/15">Ver demonstracao</Link>
              </div>
            </section>

            <section className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-4">
              {highlights.map((item) => (
                <div key={item.label} className="grid gap-2 rounded-[20px] border border-[#E2D4BF] bg-[linear-gradient(180deg,#FFFCF7,#F4ECE2)] p-[18px] shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                  <div className="text-[28px] font-extrabold">{item.value}</div>
                  <div className="text-[13px] text-[#60718A]">{item.label}</div>
                </div>
              ))}
            </section>

            <section className="grid gap-[18px] xl:grid-cols-3">
              <div className="rounded-[24px] border border-[#E2D4BF] bg-[#FFFCF7] p-5 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                <h2 className="text-xl font-semibold">O que o cliente faz</h2>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[16px] border border-[#E2D4BF] bg-[#F4ECE2] p-4"><strong className="block">Entende a estrutura</strong><small className="mt-1 block text-[#60718A]">empresa, estabelecimentos, setores e atividades</small></div>
                  <div className="rounded-[16px] border border-[#E2D4BF] bg-[#F4ECE2] p-4"><strong className="block">Responde perguntas simples</strong><small className="mt-1 block text-[#60718A]">sem precisar saber a NR-1 inteira</small></div>
                  <div className="rounded-[16px] border border-[#E2D4BF] bg-[#F4ECE2] p-4"><strong className="block">Valida riscos e ações</strong><small className="mt-1 block text-[#60718A]">com linguagem de gestão do trabalho</small></div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E2D4BF] bg-[#FFFCF7] p-5 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                <h2 className="text-xl font-semibold">O que o sistema entrega</h2>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[16px] border border-[#E2D4BF] bg-[#F4ECE2] p-4"><strong className="block">Inventario organizado</strong><small className="mt-1 block text-[#60718A]">gerado a partir da jornada</small></div>
                  <div className="rounded-[16px] border border-[#E2D4BF] bg-[#F4ECE2] p-4"><strong className="block">Plano de ação</strong><small className="mt-1 block text-[#60718A]">responsavel, prazo e acompanhamento</small></div>
                  <div className="rounded-[16px] border border-[#E2D4BF] bg-[#F4ECE2] p-4"><strong className="block">Trilha documental</strong><small className="mt-1 block text-[#60718A]">evidências, revisões e histórico</small></div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E2D4BF] bg-[#FFFCF7] p-5 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                <h2 className="text-xl font-semibold">Ideia visual do produto</h2>
                <p className="mt-3 text-sm leading-7 text-[#60718A]">Esta pagina publica assume papel de vitrine. A demonstracao mostra a experiencia. A execucao real segue atras de autenticacao.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-[#D6B56C] bg-[#FFF8EA] px-[10px] py-[7px] text-xs font-bold text-[#8B5E34]">produto guiado</span>
                  <span className="inline-flex rounded-full border border-[#D6B56C] bg-[#FFF8EA] px-[10px] py-[7px] text-xs font-bold text-[#8B5E34]">nao tecnico na frente</span>
                  <span className="inline-flex rounded-full border border-[#D6B56C] bg-[#FFF8EA] px-[10px] py-[7px] text-xs font-bold text-[#8B5E34]">robusto por tras</span>
                </div>
              </div>
            </section>

            <section className="grid gap-[18px] lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-[#E2D4BF] bg-[#FFFCF7] p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">Apresentacao honesta do modulo</h2>
                  <span className="text-[13px] text-[#60718A]">vitrine publica</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#60718A]">Esta tela nao e mais ponto de entrada operacional camuflado. Ela explica a proposta do modulo e direciona o usuario para o fluxo certo.</p>
                <div className="mt-5 rounded-[18px] border border-[#E2D4BF] bg-[#F4ECE2] p-5">
                  <div className="text-sm font-semibold">Resultado esperado desta UX</div>
                  <ul className="mt-3 grid gap-2 text-sm leading-7 text-[#60718A]">
                    <li>1. Demonstracao publica sem depender de sessao.</li>
                    <li>2. Execucao real atras de autenticacao.</li>
                    <li>3. Linguagem clara sobre o que cada botão faz.</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E2D4BF] bg-[#FFFCF7] p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">Etapas da jornada</h2>
                  <span className="text-[13px] text-[#60718A]">leitura executiva</span>
                </div>
                <div className="mt-4 grid gap-3">
                  {steps.map((step, index) => (
                    <div key={step} className="rounded-[16px] border border-[#E2D4BF] bg-[#F4ECE2] px-4 py-4 text-sm">
                      <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F4ECE2] text-xs font-semibold">{index + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>

        <aside className="hidden border-l border-[#E2D4BF] bg-[#F7F3EC] px-[18px] py-[22px] xl:block xl:sticky xl:top-0 xl:min-h-screen">
          <div className="mb-4 rounded-[22px] border border-[#E2D4BF] bg-[#FFFCF7] p-[18px] shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <h3 className="text-base font-semibold">Resumo da proposta visual</h3>
            <p className="mt-2 text-sm leading-7 text-[#60718A]">A interface foi desenhada para parecer assistente de adequacao e gestao, nao formulario tecnico de SST.</p>
          </div>

          <div className="mb-4 rounded-[22px] border border-[#E2D4BF] bg-[#FFFCF7] p-[18px] shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <h3 className="text-base font-semibold">Principios fixos</h3>
            <div className="mt-4 grid gap-3">
              {principles.slice(0, 4).map((item) => (
                <div key={item} className="grid grid-cols-[12px_1fr] items-start gap-3">
                  <div className="mt-1 h-3 w-3 rounded-full bg-[#D6B56C] shadow-[0_0_0_4px_rgba(214,181,108,0.18)]" />
                  <div className="text-sm text-[#60718A]"><strong className="text-[#10243E]">{item}</strong></div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[#E2D4BF] bg-[#FFFCF7] p-[18px] shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
            <h3 className="text-base font-semibold">Estado atual do modulo</h3>
            <div className="mt-4 grid gap-3">
              {pillars.map((item) => (
                <div key={item.title} className="rounded-[16px] border border-[#E2D4BF] bg-[#F4ECE2] p-4">
                  <strong className="block">{item.title}</strong>
                  <small className="mt-1 block text-[#60718A]">{item.text}</small>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
