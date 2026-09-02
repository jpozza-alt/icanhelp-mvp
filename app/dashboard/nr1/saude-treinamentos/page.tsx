"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import Nr1WorkspaceV2Shell from "@/components/nr1/Nr1WorkspaceV2Shell";

const supabaseBrowserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
);

type TrainingRecord = {
  id: string;
  establishment_id?: string | null;
  training_name?: string | null;
  target_audience?: string | null;
  status?: string | null;
  periodicity?: string | null;
  last_date?: string | null;
  next_due_date?: string | null;
  responsible_name?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

type OccupationalHealthRef = {
  id: string;
  establishment_id?: string | null;
  pcmso_exists?: boolean | null;
  pcmso_validity_date?: string | null;
  technical_responsible?: string | null;
  has_work_related_absences?: boolean | null;
  has_accident_or_disease_requiring_review?: boolean | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

type TrainingFormState = {
  training_name: string;
  target_audience: string;
  status: string;
  periodicity: string;
  last_date: string;
  next_due_date: string;
  responsible_name: string;
  notes: string;
};

type HealthFormState = {
  pcmso_exists: string;
  pcmso_validity_date: string;
  technical_responsible: string;
  has_work_related_absences: string;
  has_accident_or_disease_requiring_review: string;
  notes: string;
};

const EMPTY_TRAINING_FORM: TrainingFormState = {
  training_name: "",
  target_audience: "",
  status: "",
  periodicity: "",
  last_date: "",
  next_due_date: "",
  responsible_name: "",
  notes: "",
};

const EMPTY_HEALTH_FORM: HealthFormState = {
  pcmso_exists: "",
  pcmso_validity_date: "",
  technical_responsible: "",
  has_work_related_absences: "",
  has_accident_or_disease_requiring_review: "",
  notes: "",
};

const STATUS_SUGGESTIONS = [
  "planned",
  "pending",
  "scheduled",
  "in_progress",
  "completed",
  "overdue",
  "expired",
  "cancelled",
  "not_required",
];

const PERIODICITY_SUGGESTIONS = [
  "once",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "biennial",
  "as_needed",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: unknown, keys: string[]): string {
  if (!isRecord(source)) {
    return "";
  }

  for (const key of keys) {
    const candidate = source[key];
    if (typeof candidate === "string") {
      return candidate;
    }
    if (typeof candidate === "number") {
      return String(candidate);
    }
  }

  return "";
}

function readBoolean(source: unknown, keys: string[]): boolean | null {
  if (!isRecord(source)) {
    return null;
  }

  for (const key of keys) {
    const candidate = source[key];
    if (typeof candidate === "boolean") {
      return candidate;
    }
  }

  return null;
}

function extractArray(payload: unknown, preferredKeys: string[]): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of preferredKeys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  for (const candidate of Object.values(payload)) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  return [];
}

function extractRecords(payload: unknown, preferredKeys: string[]): Record<string, unknown>[] {
  const found = extractArray(payload, preferredKeys);
  if (found.length > 0) {
    return found;
  }

  if (isRecord(payload) && readString(payload, ["id"]) !== "") {
    return [payload];
  }

  return [];
}

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toBooleanOrNull(value: string): boolean | null {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function toInputDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  if (value.length >= 10) {
    return value.slice(0, 10);
  }

  return value;
}

function toDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("pt-BR");
}

function toDisplayDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR");
}

function boolToLabel(value: boolean | null | undefined): string {
  if (value === true) {
    return "Sim";
  }
  if (value === false) {
    return "Nao";
  }
  return "-";
}

function normalizeTrainingForm(record: TrainingRecord): TrainingFormState {
  return {
    training_name: readString(record, ["training_name"]),
    target_audience: readString(record, ["target_audience"]),
    status: readString(record, ["status"]),
    periodicity: readString(record, ["periodicity"]),
    last_date: toInputDate(readString(record, ["last_date"])),
    next_due_date: toInputDate(readString(record, ["next_due_date"])),
    responsible_name: readString(record, ["responsible_name"]),
    notes: readString(record, ["notes"]),
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      readString(payload, ["message", "error", "detail"]) ||
      `HTTP ${response.status} ao chamar ${url}`;
    throw new Error(message);
  }

  return payload;
}

async function getBrowserAccessToken(): Promise<string> {
  const result = await supabaseBrowserClient.auth.getSession();
  const accessToken = result.data.session?.access_token?.trim() ?? "";
  if (!accessToken) throw new Error("Autenticacao necessaria para continuar.");
  return accessToken;
}

async function resolveContext(): Promise<{ tenantId: string; establishmentId: string }> {
  let tenantId = "";
  let establishmentId = "";
  const accessToken = await getBrowserAccessToken();

  try {
    const activePayload = await fetchJson("/api/tenants/active", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (isRecord(activePayload)) {
      tenantId =
        readString(activePayload, ["tenantId", "tenant_id", "activeTenantId", "active_tenant_id"]) ||
        readString(activePayload["activeTenant"], ["id", "tenantId", "tenant_id"]);
      establishmentId =
        readString(activePayload, ["establishmentId", "establishment_id", "activeEstablishmentId", "active_establishment_id"]) ||
        readString(activePayload["activeEstablishment"], ["id", "establishmentId", "establishment_id"]) ||
        readString(activePayload["establishment"], ["id", "establishmentId", "establishment_id"]);
    }
  } catch {
  }

  if (!tenantId) {
    try {
      const tenantsPayload = await fetchJson("/api/tenants");
      const tenants = extractRecords(tenantsPayload, ["tenants", "items", "data"]);
      if (tenants.length > 0) {
        tenantId = readString(tenants[0], ["id", "tenantId", "tenant_id"]);
      }
    } catch {
    }
  }

  return { tenantId, establishmentId };
}

export default function SaudeTreinamentosPage() {
  const [tenantId, setTenantId] = useState("");
  const [establishmentId, setEstablishmentId] = useState("");

  const [healthRefs, setHealthRefs] = useState<OccupationalHealthRef[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);

  const [healthForm, setHealthForm] = useState<HealthFormState>(EMPTY_HEALTH_FORM);
  const [trainingForm, setTrainingForm] = useState<TrainingFormState>(EMPTY_TRAINING_FORM);

  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(null);
  const [editingTrainingForm, setEditingTrainingForm] = useState<TrainingFormState>(EMPTY_TRAINING_FORM);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingHealth, setIsSavingHealth] = useState(false);
  const [isSavingTraining, setIsSavingTraining] = useState(false);
  const [isSavingTrainingEdit, setIsSavingTrainingEdit] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData(options?: { keepSuccess?: boolean }) {
    const keepSuccess = options?.keepSuccess ?? false;

    setErrorMessage("");
    if (!keepSuccess) {
      setSuccessMessage("");
    }

    const isFirstLoad = isInitialLoading;
    if (!isFirstLoad) {
      setIsRefreshing(true);
    }

    try {
      let effectiveTenantId = tenantId.trim();
      let effectiveEstablishmentId = establishmentId.trim();

      if (!effectiveTenantId || !effectiveEstablishmentId) {
        const context = await resolveContext();
        if (!effectiveTenantId) {
          effectiveTenantId = context.tenantId;
        }
        if (!effectiveEstablishmentId) {
          effectiveEstablishmentId = context.establishmentId;
        }
      }

      if (!effectiveTenantId) {
        throw new Error("Nao foi possivel resolver tenantId automaticamente. Preencha manualmente no topo da tela.");
      }

      if (effectiveTenantId !== tenantId) {
        setTenantId(effectiveTenantId);
      }

      if (!effectiveEstablishmentId) {
        try {
          const establishmentsPayload = await fetchJson(
            `/api/nr1/establishments?tenantId=${encodeURIComponent(effectiveTenantId)}`
          );

          const establishments = extractRecords(establishmentsPayload, [
            "establishments",
            "items",
            "data",
          ]);

          if (establishments.length > 0) {
            effectiveEstablishmentId = readString(establishments[0], [
              "id",
              "establishmentId",
              "establishment_id",
            ]);
          }
        } catch {
        }
      }

      if (!effectiveEstablishmentId) {
        throw new Error(
          "Nao foi possivel resolver establishmentId automaticamente. Cadastre ao menos um estabelecimento no tenant ativo ou preencha manualmente no topo da tela."
        );
      }

      if (effectiveEstablishmentId !== establishmentId) {
        setEstablishmentId(effectiveEstablishmentId);
      }

      const [healthPayload, trainingPayload] = await Promise.all([
        fetchJson(
          `/api/nr1/occupational-health-refs?tenantId=${encodeURIComponent(effectiveTenantId)}&establishmentId=${encodeURIComponent(effectiveEstablishmentId)}`
        ),
        fetchJson(
          `/api/nr1/training-records?tenantId=${encodeURIComponent(effectiveTenantId)}&establishmentId=${encodeURIComponent(effectiveEstablishmentId)}`
        ),
      ]);

      const healthItems = extractRecords(healthPayload, [
        "occupationalHealthRefs",
        "occupational_health_refs",
        "references",
        "items",
        "data",
      ]) as OccupationalHealthRef[];

      const trainingItems = extractRecords(trainingPayload, [
        "trainingRecords",
        "training_records",
        "items",
        "data",
      ]) as TrainingRecord[];

      healthItems.sort((a, b) => {
        const left = readString(a, ["updated_at", "created_at"]);
        const right = readString(b, ["updated_at", "created_at"]);
        return right.localeCompare(left);
      });

      trainingItems.sort((a, b) => {
        const left = readString(a, ["next_due_date", "updated_at", "created_at"]);
        const right = readString(b, ["next_due_date", "updated_at", "created_at"]);
        return right.localeCompare(left);
      });

      setHealthRefs(healthItems);
      setTrainingRecords(trainingItems);

      if (!effectiveEstablishmentId) {
        effectiveEstablishmentId =
          readString(trainingItems[0], ["establishment_id"]) ||
          readString(healthItems[0], ["establishment_id"]);
      }

      if (effectiveEstablishmentId && effectiveEstablishmentId !== establishmentId) {
        setEstablishmentId(effectiveEstablishmentId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada ao carregar a tela.";
      setErrorMessage(message);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function beginTrainingEdit(record: TrainingRecord) {
    setEditingTrainingId(record.id);
    setEditingTrainingForm(normalizeTrainingForm(record));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function cancelTrainingEdit() {
    setEditingTrainingId(null);
    setEditingTrainingForm(EMPTY_TRAINING_FORM);
    setErrorMessage("");
  }

  async function handleTrainingCreate() {
    setErrorMessage("");
    setSuccessMessage("");

    const effectiveTenantId = tenantId.trim();
    const effectiveEstablishmentId = establishmentId.trim();

    if (!effectiveTenantId) {
      setErrorMessage("tenantId obrigatorio.");
      return;
    }

    if (!effectiveEstablishmentId) {
      setErrorMessage("establishment_id obrigatorio.");
      return;
    }

    setIsSavingTraining(true);

    try {
      const payload = {
        establishment_id: effectiveEstablishmentId,
        training_name: trimOrNull(trainingForm.training_name),
        target_audience: trimOrNull(trainingForm.target_audience),
        status: trimOrNull(trainingForm.status),
        periodicity: trimOrNull(trainingForm.periodicity),
        last_date: trimOrNull(trainingForm.last_date),
        next_due_date: trimOrNull(trainingForm.next_due_date),
        responsible_name: trimOrNull(trainingForm.responsible_name),
        notes: trimOrNull(trainingForm.notes),
      };

      await fetchJson(`/api/nr1/training-records?tenantId=${encodeURIComponent(effectiveTenantId)}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTrainingForm(EMPTY_TRAINING_FORM);
      setSuccessMessage("Treinamento criado com sucesso.");
      await loadData({ keepSuccess: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao criar treinamento.";
      setErrorMessage(message);
    } finally {
      setIsSavingTraining(false);
    }
  }

  async function handleTrainingEditSave(recordId: string) {
    setErrorMessage("");
    setSuccessMessage("");

    const effectiveTenantId = tenantId.trim();
    if (!effectiveTenantId) {
      setErrorMessage("tenantId obrigatorio.");
      return;
    }

    const currentRecord = trainingRecords.find((item) => item.id === recordId);
    const effectiveEstablishmentId =
      establishmentId.trim() ||
      readString(currentRecord, ["establishment_id"]);

    if (!effectiveEstablishmentId) {
      setErrorMessage("establishment_id obrigatorio.");
      return;
    }

    setIsSavingTrainingEdit(true);

    try {
      const payload = {
        id: recordId,
        establishment_id: effectiveEstablishmentId,
        training_name: trimOrNull(editingTrainingForm.training_name),
        target_audience: trimOrNull(editingTrainingForm.target_audience),
        status: trimOrNull(editingTrainingForm.status),
        periodicity: trimOrNull(editingTrainingForm.periodicity),
        last_date: trimOrNull(editingTrainingForm.last_date),
        next_due_date: trimOrNull(editingTrainingForm.next_due_date),
        responsible_name: trimOrNull(editingTrainingForm.responsible_name),
        notes: trimOrNull(editingTrainingForm.notes),
      };

      await fetchJson(`/api/nr1/training-records?tenantId=${encodeURIComponent(effectiveTenantId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setEditingTrainingId(null);
      setEditingTrainingForm(EMPTY_TRAINING_FORM);
      setSuccessMessage("Edicao salva com sucesso.");
      await loadData({ keepSuccess: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar edicao.";
      setErrorMessage(message);
    } finally {
      setIsSavingTrainingEdit(false);
    }
  }

  async function handleHealthCreate() {
    setErrorMessage("");
    setSuccessMessage("");

    const effectiveTenantId = tenantId.trim();
    const effectiveEstablishmentId = establishmentId.trim();

    if (!effectiveTenantId) {
      setErrorMessage("tenantId obrigatorio.");
      return;
    }

    if (!effectiveEstablishmentId) {
      setErrorMessage("establishment_id obrigatorio.");
      return;
    }

    setIsSavingHealth(true);

    try {
      const payload = {
        establishment_id: effectiveEstablishmentId,
        pcmso_exists: toBooleanOrNull(healthForm.pcmso_exists),
        pcmso_validity_date: trimOrNull(healthForm.pcmso_validity_date),
        technical_responsible: trimOrNull(healthForm.technical_responsible),
        has_work_related_absences: toBooleanOrNull(healthForm.has_work_related_absences),
        has_accident_or_disease_requiring_review: toBooleanOrNull(
          healthForm.has_accident_or_disease_requiring_review,
        ),
        notes: trimOrNull(healthForm.notes),
      };

      await fetchJson(`/api/nr1/occupational-health-refs?tenantId=${encodeURIComponent(effectiveTenantId)}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setHealthForm(EMPTY_HEALTH_FORM);
      setSuccessMessage("Referencia de saude ocupacional criada com sucesso.");
      await loadData({ keepSuccess: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao criar referencia de saude ocupacional.";
      setErrorMessage(message);
    } finally {
      setIsSavingHealth(false);
    }
  }

  function renderTrainingCard(record: TrainingRecord) {
    const isEditing = editingTrainingId === record.id;

    if (isEditing) {
      return (
        <article
          key={record.id}
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-[0_8px_24px_rgba(18,40,70,0.07)]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#10243E]">
                Editando treinamento
              </h3>
              <p className="text-sm text-[#60718A]">ID: {record.id}</p>
            </div>
          </div>

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void handleTrainingEditSave(record.id);
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#40536A]">Treinamento</span>
              <input
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={editingTrainingForm.training_name}
                onChange={(event) =>
                  setEditingTrainingForm((current) => ({
                    ...current,
                    training_name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#40536A]">Publico alvo</span>
              <input
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={editingTrainingForm.target_audience}
                onChange={(event) =>
                  setEditingTrainingForm((current) => ({
                    ...current,
                    target_audience: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#40536A]">Status</span>
              <input
                list="training-status-options"
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={editingTrainingForm.status}
                onChange={(event) =>
                  setEditingTrainingForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#40536A]">Periodicidade</span>
              <input
                list="training-periodicity-options"
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={editingTrainingForm.periodicity}
                onChange={(event) =>
                  setEditingTrainingForm((current) => ({
                    ...current,
                    periodicity: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#40536A]">Data do ultimo</span>
              <input
                type="date"
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={editingTrainingForm.last_date}
                onChange={(event) =>
                  setEditingTrainingForm((current) => ({
                    ...current,
                    last_date: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#40536A]">Proximo vencimento</span>
              <input
                type="date"
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={editingTrainingForm.next_due_date}
                onChange={(event) =>
                  setEditingTrainingForm((current) => ({
                    ...current,
                    next_due_date: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-medium text-[#40536A]">Responsavel</span>
              <input
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={editingTrainingForm.responsible_name}
                onChange={(event) =>
                  setEditingTrainingForm((current) => ({
                    ...current,
                    responsible_name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-medium text-[#40536A]">Observacoes</span>
              <textarea
                className="min-h-28 rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={editingTrainingForm.notes}
                onChange={(event) =>
                  setEditingTrainingForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-[#10243E] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(16,36,62,0.16)] transition hover:bg-[#0B1A2D] disabled:opacity-60"
                disabled={isSavingTrainingEdit}
              >
                {isSavingTrainingEdit ? "Salvando..." : "Salvar edicao"}
              </button>

              <button
                type="button"
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-4 py-2 text-sm font-semibold text-[#10243E] transition hover:bg-[#F4ECE2]"
                onClick={cancelTrainingEdit}
                disabled={isSavingTrainingEdit}
              >
                Cancelar
              </button>
            </div>
          </form>
        </article>
      );
    }

    return (
      <article
        key={record.id}
        className="rounded-xl border border-[#E2D4BF] bg-[#FFFCF7] p-4 shadow-[0_8px_24px_rgba(18,40,70,0.07)]"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#10243E]">
              {readString(record, ["training_name"]) || "Treinamento sem nome"}
            </h3>
            <p className="text-sm text-[#60718A]">ID: {record.id}</p>
          </div>

          <button
            type="button"
            className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-sm font-semibold text-[#10243E] transition hover:bg-[#F4ECE2]"
            onClick={() => beginTrainingEdit(record)}
          >
            Editar
          </button>
        </div>

        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="font-medium text-[#40536A]">Publico alvo</dt>
            <dd className="text-[#10243E]">
              {readString(record, ["target_audience"]) || "-"}
            </dd>
          </div>

          <div>
            <dt className="font-medium text-[#40536A]">Status</dt>
            <dd className="text-[#10243E]">
              {readString(record, ["status"]) || "-"}
            </dd>
          </div>

          <div>
            <dt className="font-medium text-[#40536A]">Periodicidade</dt>
            <dd className="text-[#10243E]">
              {readString(record, ["periodicity"]) || "-"}
            </dd>
          </div>

          <div>
            <dt className="font-medium text-[#40536A]">Responsavel</dt>
            <dd className="text-[#10243E]">
              {readString(record, ["responsible_name"]) || "-"}
            </dd>
          </div>

          <div>
            <dt className="font-medium text-[#40536A]">Data do ultimo</dt>
            <dd className="text-[#10243E]">
              {toDisplayDate(readString(record, ["last_date"]))}
            </dd>
          </div>

          <div>
            <dt className="font-medium text-[#40536A]">Proximo vencimento</dt>
            <dd className="text-[#10243E]">
              {toDisplayDate(readString(record, ["next_due_date"]))}
            </dd>
          </div>

          <div className="md:col-span-2">
            <dt className="font-medium text-[#40536A]">Observacoes</dt>
            <dd className="whitespace-pre-wrap text-[#10243E]">
              {readString(record, ["notes"]) || "-"}
            </dd>
          </div>

          <div>
            <dt className="font-medium text-[#40536A]">Estabelecimento</dt>
            <dd className="text-[#10243E]">
              {readString(record, ["establishment_id"]) || "-"}
            </dd>
          </div>

          <div>
            <dt className="font-medium text-[#40536A]">Ultima atualizacao</dt>
            <dd className="text-[#10243E]">
              {toDisplayDateTime(readString(record, ["updated_at", "created_at"]))}
            </dd>
          </div>
        </dl>
      </article>
    );
  }

  return (
    <Nr1WorkspaceV2Shell
      companyName={tenantId ? "Empresa ativa" : "Empresa não selecionada"}
      establishmentName={establishmentId ? "Local de trabalho ativo" : "Local de trabalho não selecionado"}
      pgrStatus="Em construção"
      progressPercent={92}
      progressDescription="Saúde ocupacional e treinamentos organizados no contexto ativo."
      activeModule="Saúde e treinamentos"
      modules={["Base", "Mapeamento", "Riscos", "Plano", "Evidências", "Trilha", "Saúde e treinamentos", "PGR"]}
      pendingItems={[
        "Conferir a referência de saúde ocupacional",
        "Manter os treinamentos e vencimentos atualizados",
        "Preservar a rastreabilidade para o PGR",
      ]}
      nextBestActionLabel="Etapa da jornada"
      nextBestActionTitle="Conferir saúde ocupacional e treinamentos"
      nextBestActionDescription="Revise as referências de saúde ocupacional e mantenha os treinamentos vinculados ao local de trabalho ativo."
      nextBestActionPrimaryHref="#nr1-health-training-content"
      nextBestActionPrimaryLabel="Ver registros"
      nextBestActionSecondaryHref="/dashboard/nr1/relatorio-pgr"
      nextBestActionSecondaryLabel="Voltar para o PGR"
      nextBestActionReasons={[
        "Os registros apoiam o acompanhamento preventivo.",
        "Os vencimentos precisam permanecer atualizados.",
        "O contexto ativo preserva o escopo do estabelecimento.",
      ]}
      pgrHref="/dashboard/nr1/relatorio-pgr"
      moduleHref="#nr1-health-training-content"
    >
      <section id="nr1-health-training-content" className="min-w-0 space-y-6 text-[#10243E]">
      <datalist id="training-status-options">
        {STATUS_SUGGESTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <datalist id="training-periodicity-options">
        {PERIODICITY_SUGGESTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[24px] border border-[#D6B56C] bg-[#FFFCF7] p-6 shadow-[0_8px_24px_rgba(18,40,70,0.07)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[#A36B16]">
                NR1
              </p>
              <h1 className="text-3xl font-bold text-[#10243E]">
                Saude e Treinamentos
              </h1>
              <p className="mt-2 text-sm text-[#60718A]">
                Leitura real, criacao controlada e edicao inline de treinamento existente.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-4 py-2 text-sm font-semibold text-[#10243E] transition hover:bg-[#F4ECE2]"
                onClick={() => void loadData()}
                disabled={isRefreshing || isInitialLoading}
              >
                {isRefreshing ? "Recarregando..." : "Recarregar dados"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#40536A]">tenantId</span>
              <input
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                placeholder="Resolvido automaticamente quando possivel"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#40536A]">establishment_id</span>
              <input
                className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                value={establishmentId}
                onChange={(event) => setEstablishmentId(event.target.value)}
                placeholder="Inferido a partir dos dados quando possivel"
              />
            </label>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}
        </header>

        {isInitialLoading ? (
          <section className="rounded-[24px] border border-[#D6B56C] bg-[#FFFCF7] p-6 shadow-[0_8px_24px_rgba(18,40,70,0.07)]">
            <p className="text-sm text-[#60718A]">Carregando dados reais...</p>
          </section>
        ) : (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-[#D6B56C] bg-[#FFFCF7] p-6 shadow-[0_8px_24px_rgba(18,40,70,0.07)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-[#10243E]">
                      Saude ocupacional
                    </h2>
                    <p className="text-sm text-[#60718A]">
                      Bloco superior lendo dados reais e mantendo criacao controlada.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {healthRefs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D8C8B2] bg-[#F4ECE2] p-4 text-sm text-[#60718A]">
                      Nenhuma referencia de saude ocupacional encontrada.
                    </div>
                  ) : (
                    healthRefs.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-xl border border-[#E2D4BF] bg-[#F4ECE2] p-4"
                      >
                        <div className="mb-3">
                          <h3 className="text-lg font-semibold text-[#10243E]">
                            Referencia de saude ocupacional
                          </h3>
                          <p className="text-sm text-[#60718A]">ID: {item.id}</p>
                        </div>

                        <dl className="grid gap-3 text-sm md:grid-cols-2">
                          <div>
                            <dt className="font-medium text-[#40536A]">PCMSO vigente</dt>
                            <dd className="text-[#10243E]">
                              {boolToLabel(readBoolean(item, ["pcmso_exists"]))}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-medium text-[#40536A]">Vigencia</dt>
                            <dd className="text-[#10243E]">
                              {toDisplayDate(readString(item, ["pcmso_validity_date"]))}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-medium text-[#40536A]">Responsavel tecnico</dt>
                            <dd className="text-[#10243E]">
                              {readString(item, ["technical_responsible"]) || "-"}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-medium text-[#40536A]">Ha afastamentos relacionados</dt>
                            <dd className="text-[#10243E]">
                              {boolToLabel(readBoolean(item, ["has_work_related_absences"]))}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-medium text-[#40536A]">Ha acidentes ou doencas que exigem revisao</dt>
                            <dd className="text-[#10243E]">
                              {boolToLabel(
                                readBoolean(item, ["has_accident_or_disease_requiring_review"]),
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-medium text-[#40536A]">Ultima atualizacao</dt>
                            <dd className="text-[#10243E]">
                              {toDisplayDateTime(readString(item, ["updated_at", "created_at"]))}
                            </dd>
                          </div>

                          <div className="md:col-span-2">
                            <dt className="font-medium text-[#40536A]">Observacoes</dt>
                            <dd className="whitespace-pre-wrap text-[#10243E]">
                              {readString(item, ["notes"]) || "-"}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#D6B56C] bg-[#FFFCF7] p-6 shadow-[0_8px_24px_rgba(18,40,70,0.07)]">
                <h2 className="text-xl font-semibold text-[#10243E]">
                  Nova referencia de saude ocupacional
                </h2>
                <p className="mt-1 text-sm text-[#60718A]">
                  Formulario de criacao mantido na mesma tela.
                </p>

                <form
                  className="mt-4 grid gap-4"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    void handleHealthCreate();
                  }}
                >
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Existe PCMSO vigente</span>
                    <select
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={healthForm.pcmso_exists}
                      onChange={(event) =>
                        setHealthForm((current) => ({
                          ...current,
                          pcmso_exists: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="true">Sim</option>
                      <option value="false">Nao</option>
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Data de vigencia</span>
                    <input
                      type="date"
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={healthForm.pcmso_validity_date}
                      onChange={(event) =>
                        setHealthForm((current) => ({
                          ...current,
                          pcmso_validity_date: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Responsavel tecnico</span>
                    <input
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={healthForm.technical_responsible}
                      onChange={(event) =>
                        setHealthForm((current) => ({
                          ...current,
                          technical_responsible: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">
                      Ha dados de afastamentos relacionados ao trabalho
                    </span>
                    <select
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={healthForm.has_work_related_absences}
                      onChange={(event) =>
                        setHealthForm((current) => ({
                          ...current,
                          has_work_related_absences: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="true">Sim</option>
                      <option value="false">Nao</option>
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">
                      Ha acidentes ou doencas que exigem revisao
                    </span>
                    <select
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={healthForm.has_accident_or_disease_requiring_review}
                      onChange={(event) =>
                        setHealthForm((current) => ({
                          ...current,
                          has_accident_or_disease_requiring_review: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="true">Sim</option>
                      <option value="false">Nao</option>
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Observacoes</span>
                    <textarea
                      className="min-h-24 rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={healthForm.notes}
                      onChange={(event) =>
                        setHealthForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#10243E] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(16,36,62,0.16)] transition hover:bg-[#0B1A2D] disabled:opacity-60"
                    disabled={isSavingHealth}
                  >
                    {isSavingHealth ? "Salvando..." : "Salvar referencia de saude"}
                  </button>
                </form>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-[#D6B56C] bg-[#FFFCF7] p-6 shadow-[0_8px_24px_rgba(18,40,70,0.07)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-[#10243E]">
                      Treinamentos
                    </h2>
                    <p className="text-sm text-[#60718A]">
                      Cards reais com edicao inline por registro.
                    </p>
                  </div>

                  <div className="rounded-full bg-[#F4ECE2] px-3 py-1 text-sm font-medium text-[#40536A]">
                    Total: {trainingRecords.length}
                  </div>
                </div>

                <div className="grid gap-4">
                  {trainingRecords.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D8C8B2] bg-[#F4ECE2] p-4 text-sm text-[#60718A]">
                      Nenhum treinamento encontrado.
                    </div>
                  ) : (
                    trainingRecords.map((record) => renderTrainingCard(record))
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#D6B56C] bg-[#FFFCF7] p-6 shadow-[0_8px_24px_rgba(18,40,70,0.07)]">
                <h2 className="text-xl font-semibold text-[#10243E]">
                  Novo treinamento
                </h2>
                <p className="mt-1 text-sm text-[#60718A]">
                  Formulario de criacao mantido na mesma tela.
                </p>

                <form
                  className="mt-4 grid gap-4"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    void handleTrainingCreate();
                  }}
                >
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Treinamento</span>
                    <input
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={trainingForm.training_name}
                      onChange={(event) =>
                        setTrainingForm((current) => ({
                          ...current,
                          training_name: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Publico alvo</span>
                    <input
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={trainingForm.target_audience}
                      onChange={(event) =>
                        setTrainingForm((current) => ({
                          ...current,
                          target_audience: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Status</span>
                    <input
                      list="training-status-options"
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={trainingForm.status}
                      onChange={(event) =>
                        setTrainingForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Periodicidade</span>
                    <input
                      list="training-periodicity-options"
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={trainingForm.periodicity}
                      onChange={(event) =>
                        setTrainingForm((current) => ({
                          ...current,
                          periodicity: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Data do ultimo</span>
                    <input
                      type="date"
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={trainingForm.last_date}
                      onChange={(event) =>
                        setTrainingForm((current) => ({
                          ...current,
                          last_date: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Proximo vencimento</span>
                    <input
                      type="date"
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={trainingForm.next_due_date}
                      onChange={(event) =>
                        setTrainingForm((current) => ({
                          ...current,
                          next_due_date: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Responsavel</span>
                    <input
                      className="rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={trainingForm.responsible_name}
                      onChange={(event) =>
                        setTrainingForm((current) => ({
                          ...current,
                          responsible_name: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#40536A]">Observacoes</span>
                    <textarea
                      className="min-h-24 rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-[#10243E] outline-none transition focus:border-[#10243E] focus:ring-2 focus:ring-[#D6B56C]/25"
                      value={trainingForm.notes}
                      onChange={(event) =>
                        setTrainingForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#10243E] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(16,36,62,0.16)] transition hover:bg-[#0B1A2D] disabled:opacity-60"
                    disabled={isSavingTraining}
                  >
                    {isSavingTraining ? "Salvando..." : "Salvar treinamento"}
                  </button>
                </form>
              </div>
            </section>
          </>
        )}
      </div>
      </section>
    </Nr1WorkspaceV2Shell>
  );
}

