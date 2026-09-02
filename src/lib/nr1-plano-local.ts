export type Nr1PlanoLocalScope = {
  userId: string;
  tenantId: string;
  establishmentId: string;
};

export type Nr1PlanoLocalDraft = {
  medidasPrioritarias: string;
  responsaveis: string;
  prazos: string;
  recursosNecessarios: string;
  criteriosAcompanhamento: string;
  observacoes: string;
  updatedAt: string | null;
  completedAt: string | null;
  isCompleted: boolean;
};

const STORAGE_PREFIX = "icanhelp:nr1:plano";

const EMPTY_DRAFT: Nr1PlanoLocalDraft = {
  medidasPrioritarias: "",
  responsaveis: "",
  prazos: "",
  recursosNecessarios: "",
  criteriosAcompanhamento: "",
  observacoes: "",
  updatedAt: null,
  completedAt: null,
  isCompleted: false,
};

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function mergeDraft(input?: Partial<Nr1PlanoLocalDraft> | null): Nr1PlanoLocalDraft {
  return {
    ...EMPTY_DRAFT,
    ...(input ?? {}),
  };
}
export function createEmptyNr1PlanoLocalDraft(): Nr1PlanoLocalDraft {
  return mergeDraft();
}


export function getNr1PlanoLocalScopeKey(scope: Nr1PlanoLocalScope): string {
  const userId = scope.userId.trim();
  const tenantId = scope.tenantId.trim();
  const establishmentId = scope.establishmentId.trim();

  if (!userId || !tenantId || !establishmentId) {
    throw new Error("nr1_plano_scope_required");
  }

  return `${userId}:${tenantId}:${establishmentId}`;
}

export function getNr1PlanoLocalStorageKey(scope: Nr1PlanoLocalScope): string {
  return `${STORAGE_PREFIX}:${getNr1PlanoLocalScopeKey(scope)}`;
}

export function readNr1PlanoLocalDraft(scope: Nr1PlanoLocalScope): Nr1PlanoLocalDraft {
  if (!hasStorage()) {
    return mergeDraft();
  }

  const storageKey = getNr1PlanoLocalStorageKey(scope);
  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return mergeDraft();
  }

  try {
    return mergeDraft(JSON.parse(raw) as Partial<Nr1PlanoLocalDraft>);
  } catch {
    return mergeDraft();
  }
}

export function writeNr1PlanoLocalDraft(
  partial: Partial<Nr1PlanoLocalDraft>,
  scope: Nr1PlanoLocalScope
): Nr1PlanoLocalDraft {
  const current = readNr1PlanoLocalDraft(scope);
  const next = mergeDraft({
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  });

  if (hasStorage()) {
    window.localStorage.setItem(
      getNr1PlanoLocalStorageKey(scope),
      JSON.stringify(next)
    );
  }

  return next;
}

export function completeNr1PlanoLocalDraft(scope: Nr1PlanoLocalScope): Nr1PlanoLocalDraft {
  const current = readNr1PlanoLocalDraft(scope);
  return writeNr1PlanoLocalDraft(
    {
      ...current,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    },
    scope
  );
}

export function clearNr1PlanoLocalDraft(scope: Nr1PlanoLocalScope): Nr1PlanoLocalDraft {
  if (hasStorage()) {
    window.localStorage.removeItem(getNr1PlanoLocalStorageKey(scope));
  }
  return mergeDraft();
}

export function isNr1PlanoLocalCompleted(scope: Nr1PlanoLocalScope): boolean {
  return readNr1PlanoLocalDraft(scope).isCompleted === true;
}

export function getNr1PlanoMissingFields(draft: Nr1PlanoLocalDraft): string[] {
  const missing: string[] = [];

  if (!draft.medidasPrioritarias.trim()) missing.push("medidas prioritarias");
  if (!draft.responsaveis.trim()) missing.push("responsaveis");
  if (!draft.prazos.trim()) missing.push("prazos");
  if (!draft.criteriosAcompanhamento.trim()) missing.push("criterios de acompanhamento");

  return missing;
}

export function getNr1PlanoLocalProgress(draft: Nr1PlanoLocalDraft): number {
  const checklist = [
    draft.medidasPrioritarias.trim().length > 0,
    draft.responsaveis.trim().length > 0,
    draft.prazos.trim().length > 0,
    draft.recursosNecessarios.trim().length > 0,
    draft.criteriosAcompanhamento.trim().length > 0,
  ];

  const completed = checklist.filter(Boolean).length;
  return Math.round((completed / checklist.length) * 100);
}