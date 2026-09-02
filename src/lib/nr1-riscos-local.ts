export type Nr1RiscosLocalScope = {
  userId: string;
  tenantId: string;
  establishmentId: string;
};

export type Nr1RiscosLocalDraft = {
  riscosLevantados: string;
  fontesGeradoras: string;
  gruposExpostos: string;
  medidasExistentes: string;
  prioridadeInicial: string;
  observacoes: string;
  possuiRiscoPsicossocial: boolean;
  possuiRiscoErgonomico: boolean;
  possuiRiscoAcidente: boolean;
  updatedAt: string | null;
  completedAt: string | null;
  isCompleted: boolean;
};

const STORAGE_PREFIX = "icanhelp:nr1:riscos";

const EMPTY_DRAFT: Nr1RiscosLocalDraft = {
  riscosLevantados: "",
  fontesGeradoras: "",
  gruposExpostos: "",
  medidasExistentes: "",
  prioridadeInicial: "",
  observacoes: "",
  possuiRiscoPsicossocial: false,
  possuiRiscoErgonomico: false,
  possuiRiscoAcidente: false,
  updatedAt: null,
  completedAt: null,
  isCompleted: false,
};

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function mergeDraft(input?: Partial<Nr1RiscosLocalDraft> | null): Nr1RiscosLocalDraft {
  return {
    ...EMPTY_DRAFT,
    ...(input ?? {}),
  };
}

export function createEmptyNr1RiscosLocalDraft(): Nr1RiscosLocalDraft {
  return mergeDraft();
}

export function getNr1RiscosLocalScopeKey(scope: Nr1RiscosLocalScope): string {
  const userId = scope.userId.trim();
  const tenantId = scope.tenantId.trim();
  const establishmentId = scope.establishmentId.trim();

  if (!userId || !tenantId || !establishmentId) {
    throw new Error("nr1_riscos_scope_required");
  }

  return `${userId}:${tenantId}:${establishmentId}`;
}

export function getNr1RiscosLocalStorageKey(scope: Nr1RiscosLocalScope): string {
  return `${STORAGE_PREFIX}:${getNr1RiscosLocalScopeKey(scope)}`;
}

export function readNr1RiscosLocalDraft(scope: Nr1RiscosLocalScope): Nr1RiscosLocalDraft {
  if (!hasStorage()) {
    return mergeDraft();
  }

  const storageKey = getNr1RiscosLocalStorageKey(scope);
  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return mergeDraft();
  }

  try {
    return mergeDraft(JSON.parse(raw) as Partial<Nr1RiscosLocalDraft>);
  } catch {
    return mergeDraft();
  }
}

export function writeNr1RiscosLocalDraft(
  partial: Partial<Nr1RiscosLocalDraft>,
  scope: Nr1RiscosLocalScope
): Nr1RiscosLocalDraft {
  const current = readNr1RiscosLocalDraft(scope);
  const next = mergeDraft({
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  });

  if (hasStorage()) {
    window.localStorage.setItem(
      getNr1RiscosLocalStorageKey(scope),
      JSON.stringify(next)
    );
  }

  return next;
}

export function completeNr1RiscosLocalDraft(scope: Nr1RiscosLocalScope): Nr1RiscosLocalDraft {
  const current = readNr1RiscosLocalDraft(scope);
  return writeNr1RiscosLocalDraft(
    {
      ...current,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    },
    scope
  );
}

export function clearNr1RiscosLocalDraft(scope: Nr1RiscosLocalScope): Nr1RiscosLocalDraft {
  if (hasStorage()) {
    window.localStorage.removeItem(getNr1RiscosLocalStorageKey(scope));
  }
  return mergeDraft();
}

export function isNr1RiscosLocalCompleted(scope: Nr1RiscosLocalScope): boolean {
  return readNr1RiscosLocalDraft(scope).isCompleted === true;
}

export function getNr1RiscosMissingFields(draft: Nr1RiscosLocalDraft): string[] {
  const missing: string[] = [];

  if (!draft.riscosLevantados.trim()) missing.push("riscos levantados");
  if (!draft.fontesGeradoras.trim()) missing.push("fontes geradoras");
  if (!draft.gruposExpostos.trim()) missing.push("grupos expostos");
  if (!draft.prioridadeInicial.trim()) missing.push("prioridade inicial");

  return missing;
}

export function getNr1RiscosLocalProgress(draft: Nr1RiscosLocalDraft): number {
  const checklist = [
    draft.riscosLevantados.trim().length > 0,
    draft.fontesGeradoras.trim().length > 0,
    draft.gruposExpostos.trim().length > 0,
    draft.medidasExistentes.trim().length > 0,
    draft.prioridadeInicial.trim().length > 0,
    draft.possuiRiscoPsicossocial,
    draft.possuiRiscoErgonomico,
    draft.possuiRiscoAcidente,
  ];

  const completed = checklist.filter(Boolean).length;
  return Math.round((completed / checklist.length) * 100);
}