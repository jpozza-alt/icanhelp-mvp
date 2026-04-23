export type Nr1SetoresLocalScope = {
  tenantId?: string | null;
  establishmentId?: string | null;
};

export type Nr1SetoresLocalDraft = {
  setoresMapeados: string;
  atividadesCriticas: string;
  quantidadeSetores: string;
  quantidadeTrabalhadoresExpostos: string;
  interfacesEntreSetores: string;
  possuiAtendimentoPublico: boolean;
  possuiDeslocamentoExterno: boolean;
  possuiAtividadeRepetitiva: boolean;
  observacoes: string;
  updatedAt: string | null;
  completedAt: string | null;
  isCompleted: boolean;
};

const STORAGE_PREFIX = "icanhelp:nr1:setores";

const EMPTY_DRAFT: Nr1SetoresLocalDraft = {
  setoresMapeados: "",
  atividadesCriticas: "",
  quantidadeSetores: "",
  quantidadeTrabalhadoresExpostos: "",
  interfacesEntreSetores: "",
  possuiAtendimentoPublico: false,
  possuiDeslocamentoExterno: false,
  possuiAtividadeRepetitiva: false,
  observacoes: "",
  updatedAt: null,
  completedAt: null,
  isCompleted: false,
};

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function mergeDraft(input?: Partial<Nr1SetoresLocalDraft> | null): Nr1SetoresLocalDraft {
  return {
    ...EMPTY_DRAFT,
    ...(input ?? {}),
  };
}

export function getNr1SetoresLocalScopeKey(scope?: Nr1SetoresLocalScope): string {
  const tenantId = scope?.tenantId?.trim() || "tenant-local";
  const establishmentId = scope?.establishmentId?.trim() || "estabelecimento-local";
  return `${tenantId}:${establishmentId}`;
}

export function getNr1SetoresLocalStorageKey(scope?: Nr1SetoresLocalScope): string {
  return `${STORAGE_PREFIX}:${getNr1SetoresLocalScopeKey(scope)}`;
}

export function readNr1SetoresLocalDraft(scope?: Nr1SetoresLocalScope): Nr1SetoresLocalDraft {
  if (!hasStorage()) {
    return mergeDraft();
  }

  const storageKey = getNr1SetoresLocalStorageKey(scope);
  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return mergeDraft();
  }

  try {
    return mergeDraft(JSON.parse(raw) as Partial<Nr1SetoresLocalDraft>);
  } catch {
    return mergeDraft();
  }
}

export function writeNr1SetoresLocalDraft(
  partial: Partial<Nr1SetoresLocalDraft>,
  scope?: Nr1SetoresLocalScope
): Nr1SetoresLocalDraft {
  const current = readNr1SetoresLocalDraft(scope);
  const next = mergeDraft({
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  });

  if (hasStorage()) {
    window.localStorage.setItem(
      getNr1SetoresLocalStorageKey(scope),
      JSON.stringify(next)
    );
  }

  return next;
}

export function completeNr1SetoresLocalDraft(scope?: Nr1SetoresLocalScope): Nr1SetoresLocalDraft {
  const current = readNr1SetoresLocalDraft(scope);
  return writeNr1SetoresLocalDraft(
    {
      ...current,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    },
    scope
  );
}

export function clearNr1SetoresLocalDraft(scope?: Nr1SetoresLocalScope): Nr1SetoresLocalDraft {
  if (hasStorage()) {
    window.localStorage.removeItem(getNr1SetoresLocalStorageKey(scope));
  }
  return mergeDraft();
}

export function isNr1SetoresLocalCompleted(scope?: Nr1SetoresLocalScope): boolean {
  return readNr1SetoresLocalDraft(scope).isCompleted === true;
}

export function getNr1SetoresMissingFields(draft: Nr1SetoresLocalDraft): string[] {
  const missing: string[] = [];

  if (!draft.setoresMapeados.trim()) missing.push("setores mapeados");
  if (!draft.atividadesCriticas.trim()) missing.push("atividades criticas");
  if (!draft.quantidadeSetores.trim()) missing.push("quantidade de setores");
  if (!draft.quantidadeTrabalhadoresExpostos.trim()) missing.push("quantidade de trabalhadores expostos");

  return missing;
}

export function getNr1SetoresLocalProgress(draft: Nr1SetoresLocalDraft): number {
  const checklist = [
    draft.setoresMapeados.trim().length > 0,
    draft.atividadesCriticas.trim().length > 0,
    draft.quantidadeSetores.trim().length > 0,
    draft.quantidadeTrabalhadoresExpostos.trim().length > 0,
    draft.interfacesEntreSetores.trim().length > 0,
    draft.possuiAtendimentoPublico,
    draft.possuiDeslocamentoExterno,
    draft.possuiAtividadeRepetitiva,
  ];

  const completed = checklist.filter(Boolean).length;
  return Math.round((completed / checklist.length) * 100);
}