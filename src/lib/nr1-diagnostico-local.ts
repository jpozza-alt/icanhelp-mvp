export type Nr1DiagnosticoLocalScope = {
  userId: string;
  tenantId: string;
  establishmentId: string;
};

export type Nr1DiagnosticoLocalDraft = {
  empresaNome: string;
  estabelecimentoNome: string;
  numeroTrabalhadores: string;
  setoresMapeados: string;
  possuiAtendimentoPublico: boolean;
  possuiCobrancaPrazo: boolean;
  possuiTrabalhoRepetitivo: boolean;
  principaisMudancas: string;
  observacoes: string;
  updatedAt: string | null;
  completedAt: string | null;
  isCompleted: boolean;
};

const STORAGE_PREFIX = "icanhelp:nr1:diagnostico-inicial";

const EMPTY_DRAFT: Nr1DiagnosticoLocalDraft = {
  empresaNome: "",
  estabelecimentoNome: "",
  numeroTrabalhadores: "",
  setoresMapeados: "",
  possuiAtendimentoPublico: false,
  possuiCobrancaPrazo: false,
  possuiTrabalhoRepetitivo: false,
  principaisMudancas: "",
  observacoes: "",
  updatedAt: null,
  completedAt: null,
  isCompleted: false,
};

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function mergeDraft(input?: Partial<Nr1DiagnosticoLocalDraft> | null): Nr1DiagnosticoLocalDraft {
  return {
    ...EMPTY_DRAFT,
    ...(input ?? {}),
  };
}

export function createEmptyNr1DiagnosticoLocalDraft(): Nr1DiagnosticoLocalDraft {
  return mergeDraft();
}

export function getNr1DiagnosticoLocalScopeKey(scope: Nr1DiagnosticoLocalScope): string {
  const userId = scope.userId.trim();
  const tenantId = scope.tenantId.trim();
  const establishmentId = scope.establishmentId.trim();

  if (!userId || !tenantId || !establishmentId) {
    throw new Error("nr1_diagnostico_scope_required");
  }

  return `${userId}:${tenantId}:${establishmentId}`;
}

export function getNr1DiagnosticoLocalStorageKey(scope: Nr1DiagnosticoLocalScope): string {
  return `${STORAGE_PREFIX}:${getNr1DiagnosticoLocalScopeKey(scope)}`;
}

export function readNr1DiagnosticoLocalDraft(scope: Nr1DiagnosticoLocalScope): Nr1DiagnosticoLocalDraft {
  if (!hasStorage()) {
    return mergeDraft();
  }

  const storageKey = getNr1DiagnosticoLocalStorageKey(scope);
  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return mergeDraft();
  }

  try {
    return mergeDraft(JSON.parse(raw) as Partial<Nr1DiagnosticoLocalDraft>);
  } catch {
    return mergeDraft();
  }
}

export function writeNr1DiagnosticoLocalDraft(
  partial: Partial<Nr1DiagnosticoLocalDraft>,
  scope: Nr1DiagnosticoLocalScope
): Nr1DiagnosticoLocalDraft {
  const current = readNr1DiagnosticoLocalDraft(scope);
  const next = mergeDraft({
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  });

  if (hasStorage()) {
    window.localStorage.setItem(
      getNr1DiagnosticoLocalStorageKey(scope),
      JSON.stringify(next)
    );
  }

  return next;
}

export function completeNr1DiagnosticoLocalDraft(scope: Nr1DiagnosticoLocalScope): Nr1DiagnosticoLocalDraft {
  const current = readNr1DiagnosticoLocalDraft(scope);
  return writeNr1DiagnosticoLocalDraft(
    {
      ...current,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    },
    scope
  );
}

export function clearNr1DiagnosticoLocalDraft(scope: Nr1DiagnosticoLocalScope): Nr1DiagnosticoLocalDraft {
  if (hasStorage()) {
    window.localStorage.removeItem(getNr1DiagnosticoLocalStorageKey(scope));
  }
  return mergeDraft();
}

export function isNr1DiagnosticoLocalCompleted(scope: Nr1DiagnosticoLocalScope): boolean {
  return readNr1DiagnosticoLocalDraft(scope).isCompleted === true;
}

export function getNr1DiagnosticoMissingFields(draft: Nr1DiagnosticoLocalDraft): string[] {
  const missing: string[] = [];

  if (!draft.empresaNome.trim()) missing.push("nome da empresa");
  if (!draft.estabelecimentoNome.trim()) missing.push("nome do estabelecimento");
  if (!draft.numeroTrabalhadores.trim()) missing.push("numero de trabalhadores");
  if (!draft.setoresMapeados.trim()) missing.push("setores mapeados");

  return missing;
}

export function getNr1DiagnosticoLocalProgress(draft: Nr1DiagnosticoLocalDraft): number {
  const checklist = [
    draft.empresaNome.trim().length > 0,
    draft.estabelecimentoNome.trim().length > 0,
    draft.numeroTrabalhadores.trim().length > 0,
    draft.setoresMapeados.trim().length > 0,
    draft.principaisMudancas.trim().length > 0,
    draft.possuiAtendimentoPublico,
    draft.possuiCobrancaPrazo,
    draft.possuiTrabalhoRepetitivo,
  ];

  const completed = checklist.filter(Boolean).length;
  return Math.round((completed / checklist.length) * 100);
}