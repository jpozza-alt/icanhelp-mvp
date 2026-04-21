'use client';

import { useEffect, useMemo, useState } from 'react';

const COMPANY_KEY = 'nr1_workspace_company';
const ESTABLISHMENT_KEY = 'nr1_workspace_establishment';

type RouteCard = {
  path: string;
  title: string;
  description: string;
  badge: string;
};

function normalizeValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return decodeURIComponent(trimmed).trim() || null;
  } catch {
    return trimmed || null;
  }
}

function readStoredValue(key: string): string | null {
  try {
    return normalizeValue(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function buildHref(path: string, company: string, establishment: string): string {
  const params = new URLSearchParams();
  params.set('company', company);
  params.set('establishment', establishment);

  return path + '?' + params.toString();
}

export default function Nr1WorkspaceOperationalLinks() {
  const [company, setCompany] = useState<string | null>(null);
  const [establishment, setEstablishment] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setCompany(readStoredValue(COMPANY_KEY));
    setEstablishment(readStoredValue(ESTABLISHMENT_KEY));
    setIsReady(true);
  }, []);

  const hasContext = Boolean(company && establishment);

  const cards = useMemo<RouteCard[]>(() => {
    return [
      {
        path: '/dashboard/nr1/diagnostico-inicial',
        title: 'Diagnostico inicial',
        description: 'Conferir a situacao atual, prioridades e lacunas de adequacao antes de aprofundar a jornada.',
        badge: 'Comeco'
      },
      {
        path: '/dashboard/nr1/setores',
        title: 'Setores e atividades',
        description: 'Mapear setores, atividades e frentes de trabalho ja com o contexto operacional herdado.',
        badge: 'Mapa'
      },
      {
        path: '/dashboard/nr1/riscos',
        title: 'Riscos e prioridades',
        description: 'Entrar na camada de riscos ja usando a empresa e o estabelecimento ativos.',
        badge: 'Analise'
      },
      {
        path: '/dashboard/nr1/plano-de-acao',
        title: 'Plano de acao',
        description: 'Transformar os riscos em execucao com acompanhamento objetivo e rota canonica.',
        badge: 'Execucao'
      }
    ];
  }, []);

  function handleOpen(path: string) {
    if (!company || !establishment) {
      return;
    }

    const href = buildHref(path, company, establishment);
    window.location.assign(href);
  }

  return (
    <section className="mx-auto mb-6 max-w-6xl rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
            Navegacao operacional
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">Acessos canônicos da jornada NR-1</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Estes atalhos so sao liberados quando o contexto operacional estiver realmente carregado no workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div><span className="font-semibold text-slate-900">Empresa:</span> {company ?? 'Nao definida'}</div>
          <div className="mt-1"><span className="font-semibold text-slate-900">Estabelecimento:</span> {establishment ?? 'Nao definido'}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {hasContext
          ? 'Contexto confirmado. Os acessos abaixo vao abrir as rotas canonicas ja com company e establishment.'
          : isReady
            ? 'Contexto ainda nao disponivel. Volte ao topo do workspace, confirme empresa e estabelecimento e aguarde a liberacao dos atalhos.'
            : 'Carregando contexto operacional do workspace...'}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const disabled = !hasContext;
          const disabledClassName = disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
            : 'border-slate-200 bg-slate-50 text-slate-900 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm';

          return (
            <button
              key={card.path}
              type="button"
              onClick={() => handleOpen(card.path)}
              disabled={disabled}
              className={'group rounded-3xl border p-5 text-left transition ' + disabledClassName}
            >
              <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                {card.badge}
              </div>

              <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-6">{card.description}</p>

              <div className="mt-4 text-sm font-semibold text-indigo-700">
                {disabled ? 'Aguardando contexto' : 'Abrir etapa'}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}