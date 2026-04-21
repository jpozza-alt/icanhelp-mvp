'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const COMPANY_KEY = 'nr1_workspace_company';
const ESTABLISHMENT_KEY = 'nr1_workspace_establishment';

type RouteCard = {
  href: string;
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

function buildHref(path: string, company: string | null, establishment: string | null): string {
  const params = new URLSearchParams();

  if (company) {
    params.set('company', company);
  }

  if (establishment) {
    params.set('establishment', establishment);
  }

  const query = params.toString();
  return query ? path + '?' + query : path;
}

export default function Nr1WorkspaceOperationalLinks() {
  const [company, setCompany] = useState<string | null>(null);
  const [establishment, setEstablishment] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setCompany(readStoredValue(COMPANY_KEY));
    setEstablishment(readStoredValue(ESTABLISHMENT_KEY));
  }, []);

  const cards = useMemo<RouteCard[]>(() => {
    return [
      {
        href: buildHref('/dashboard/nr1/diagnostico-inicial', company, establishment),
        title: 'Diagnostico inicial',
        description: 'Conferir a situacao atual, prioridades e lacunas de adequacao antes de aprofundar a jornada.',
        badge: 'Comeco'
      },
      {
        href: buildHref('/dashboard/nr1/setores', company, establishment),
        title: 'Setores e atividades',
        description: 'Mapear setores, atividades e frentes de trabalho ja com o contexto operacional herdado.',
        badge: 'Mapa'
      },
      {
        href: buildHref('/dashboard/nr1/riscos', company, establishment),
        title: 'Riscos e prioridades',
        description: 'Entrar na camada de riscos ja usando a empresa e o estabelecimento ativos.',
        badge: 'Analise'
      },
      {
        href: buildHref('/dashboard/nr1/plano-de-acao', company, establishment),
        title: 'Plano de acao',
        description: 'Transformar os riscos em execucao com acompanhamento objetivo e rota canonica.',
        badge: 'Execucao'
      }
    ];
  }, [company, establishment]);

  return (
    <section className="mx-auto mb-6 max-w-6xl rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
            Navegacao operacional
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">Acessos canônicos da jornada NR-1</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Estes atalhos usam o contexto confirmado no workspace e levam direto para as etapas reais da jornada operacional.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div><span className="font-semibold text-slate-900">Empresa:</span> {company ?? 'Nao definida'}</div>
          <div className="mt-1"><span className="font-semibold text-slate-900">Estabelecimento:</span> {establishment ?? 'Nao definido'}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href + card.title}
            href={card.href}
            className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm"
          >
            <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
              {card.badge}
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>

            <div className="mt-4 text-sm font-semibold text-indigo-700 group-hover:text-indigo-800">
              Abrir etapa
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}