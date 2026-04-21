'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const COMPANY_KEY = 'nr1_workspace_company';
const ESTABLISHMENT_KEY = 'nr1_workspace_establishment';

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

export default function Nr1WorkspaceContextBar() {
  const [isReady, setIsReady] = useState(false);
  const [company, setCompany] = useState<string | null>(null);
  const [establishment, setEstablishment] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState('indefinido');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    const queryCompany = normalizeValue(params.get('company'));
    const queryEstablishment = normalizeValue(params.get('establishment'));

    const storedCompany = readStoredValue(COMPANY_KEY);
    const storedEstablishment = readStoredValue(ESTABLISHMENT_KEY);

    const nextCompany = queryCompany ?? storedCompany;
    const nextEstablishment = queryEstablishment ?? storedEstablishment;

    if (nextCompany) {
      window.localStorage.setItem(COMPANY_KEY, nextCompany);
    }

    if (nextEstablishment) {
      window.localStorage.setItem(ESTABLISHMENT_KEY, nextEstablishment);
    }

    if (queryCompany || queryEstablishment) {
      if ((queryCompany && !queryEstablishment) || (!queryCompany && queryEstablishment)) {
        setSourceLabel('querystring + localStorage');
      } else {
        setSourceLabel('querystring');
      }
    } else if (storedCompany || storedEstablishment) {
      setSourceLabel('localStorage');
    } else {
      setSourceLabel('sem contexto');
    }

    setCompany(nextCompany);
    setEstablishment(nextEstablishment);
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <section className="mx-auto mb-6 max-w-6xl rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="text-sm text-slate-500">Carregando contexto operacional...</div>
      </section>
    );
  }

  const hasContext = Boolean(company && establishment);

  if (!hasContext) {
    return (
      <section className="mx-auto mb-6 max-w-6xl rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Contexto obrigatorio
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Selecione empresa e estabelecimento antes de continuar</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-700">
              Esta etapa real precisa de contexto operacional ativo. Volte ao workspace, confirme a empresa e o estabelecimento, e depois retorne para esta tela.
            </p>
          </div>

          <div className="flex shrink-0">
            <Link
              href="/dashboard/nr1/workspace"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Voltar ao workspace
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mb-6 max-w-6xl rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Contexto operacional ativo
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Empresa ativa</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{company}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Estabelecimento ativo</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{establishment}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Origem: {sourceLabel}
          </div>

          <Link
            href="/dashboard/nr1/workspace"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Trocar contexto
          </Link>
        </div>
      </div>
    </section>
  );
}