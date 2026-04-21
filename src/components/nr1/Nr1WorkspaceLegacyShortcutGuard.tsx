'use client';

import { useEffect } from 'react';

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

function buildHref(path: string, company: string, establishment: string): string {
  const params = new URLSearchParams();
  params.set('company', company);
  params.set('establishment', establishment);

  return path + '?' + params.toString();
}

function inferCanonicalPath(text: string): string | null {
  const normalized = text.toLowerCase();

  if (normalized.includes('riscos e prioridades')) {
    return '/dashboard/nr1/riscos';
  }

  if (normalized.includes('plano de acao') || normalized.includes('plano de ação')) {
    return '/dashboard/nr1/plano-de-acao';
  }

  if (normalized.includes('setores e atividades')) {
    return '/dashboard/nr1/setores';
  }

  if (normalized.includes('diagnostico inicial') || normalized.includes('diagnóstico inicial')) {
    return '/dashboard/nr1/diagnostico-inicial';
  }

  return null;
}

export default function Nr1WorkspaceLegacyShortcutGuard() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const clickable = target.closest('a,button') as HTMLElement | null;
      if (!clickable) {
        return;
      }

      let combinedText = '';
      let current: HTMLElement | null = clickable;
      let depth = 0;

      while (current && depth < 6) {
        combinedText += ' ' + (current.textContent ?? '');
        current = current.parentElement;
        depth += 1;
      }

      const canonicalPath = inferCanonicalPath(combinedText);
      if (!canonicalPath) {
        return;
      }

      const company = readStoredValue(COMPANY_KEY);
      const establishment = readStoredValue(ESTABLISHMENT_KEY);

      if (!company || !establishment) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const href = buildHref(canonicalPath, company, establishment);
      window.location.assign(href);
    }

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
}