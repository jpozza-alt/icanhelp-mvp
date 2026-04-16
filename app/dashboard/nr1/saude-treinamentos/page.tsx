export default function SaudeTreinamentosPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Saúde e Treinamentos</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Acompanhe referências de saúde ocupacional e registros de treinamentos da NR-1 em um só lugar.
        </p>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Saúde ocupacional</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Consolida PCMSO, responsável técnico, indicadores de acidentes/doenças e afastamentos relacionados ao trabalho.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            <li>• Referências mais recentes por estabelecimento</li>
            <li>• Situação do PCMSO</li>
            <li>• Observações e indicadores</li>
          </ul>

          <div className="mt-5 rounded-xl bg-neutral-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Endpoint disponível
            </p>
            <code className="mt-2 block text-sm text-neutral-800">
              /api/nr1/occupational-health-refs
            </code>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Treinamentos</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Registra nome do treinamento, público-alvo, periodicidade, datas, responsável e situação do vencimento.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            <li>• Lista por estabelecimento</li>
            <li>• Histórico de registros</li>
            <li>• Status permitido: up_to_date, due_soon, overdue</li>
          </ul>

          <div className="mt-5 rounded-xl bg-neutral-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Endpoint disponível
            </p>
            <code className="mt-2 block text-sm text-neutral-800">
              /api/nr1/training-records
            </code>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Próximo passo</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Conectar esta tela aos endpoints e exibir os dados do estabelecimento ativo.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Escopo MVP</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Esta primeira versão abre a rota de navegação e organiza a área funcional sem quebrar o build.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Situação</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Backend validado. Frontend iniciado.
          </p>
        </div>
      </section>
    </main>
  )
}
