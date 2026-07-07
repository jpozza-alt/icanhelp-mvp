"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Nr1WorkspaceV2Shell from "@/components/nr1/Nr1WorkspaceV2Shell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TenantOption = {
  id: string;
  name: string;
  slug?: string | null;
};

type EstablishmentItem = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  employee_count?: number | null;
  status?: string | null;
};

type EvidenceItem = {
  id: string;
  tenant_id?: string | null;
  establishment_id?: string | null;
  title?: string | null;
  evidence_type?: string | null;
  description?: string | null;
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
  reference_date?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  validation_status?: string | null;
  responsible_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type PsychosocialFactorItem = {
  id: string;
  factor_key?: string | null;
  factor_label?: string | null;
  status?: string | null;
  confidence_level?: string | null;
  evidence_summary?: string | null;
  justification?: string | null;
  investigation_pending?: boolean | null;
  pending_action?: string | null;
};

type ApiRecord = Record<string, unknown>;

const sectionClassName =
  "rounded-3xl border border-[#D9E0E7] bg-white p-6 shadow-[0_18px_50px_rgba(34,49,63,0.08)]";
const inputClassName =
  "mt-2 w-full rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm text-[#22313F] outline-none transition focus:border-[#5E7A96]";

const allowedEvidenceLinkedEntityTypes = new Set([
  "diagnosis_session",
  "risk",
  "action_plan",
  "review_cycle",
  "training_record",
  "third_party",
]);

function isValidEvidenceLinkedEntityType(value: string): boolean {
  return allowedEvidenceLinkedEntityTypes.has(value.trim());
}

async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function asApiRecord(value: unknown): ApiRecord {
  return value !== null && typeof value === "object" ? (value as ApiRecord) : {};
}

function nullableString(value: unknown): string | null {
  return value ? String(value) : null;
}

function getPayloadItems(payload: unknown): unknown[] {
  const record = asApiRecord(payload);
  return Array.isArray(record.items) ? record.items : Array.isArray(payload) ? payload : [];
}

function getErrorMessage(payload: unknown, fallback: string): string {
  const record = asApiRecord(payload);
  return String(record.message || record.error || fallback);
}

function getExceptionMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function workspaceSelectionStorageKey(tenantId: string): string {
  return "nr1_workspace_selection:" + tenantId;
}

function getStoredWorkspaceEstablishmentId(tenantId: string): string {
  if (!tenantId || typeof window === "undefined") {
    return "";
  }

  try {
    const raw = window.localStorage.getItem(workspaceSelectionStorageKey(tenantId));
    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw) as unknown;
    const record = asApiRecord(parsed);
    return String(record.establishmentId || "").trim();
  } catch {
    return "";
  }
}

function setStoredWorkspaceEstablishmentId(tenantId: string, establishmentId: string): void {
  if (!tenantId || !establishmentId || typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(workspaceSelectionStorageKey(tenantId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    const current = asApiRecord(parsed);

    window.localStorage.setItem(
      workspaceSelectionStorageKey(tenantId),
      JSON.stringify({
        ...current,
        establishmentId,
      })
    );
  } catch {
    window.localStorage.setItem(
      workspaceSelectionStorageKey(tenantId),
      JSON.stringify({ establishmentId })
    );
  }
}

function findValidEstablishmentId(establishments: EstablishmentItem[], establishmentId: string): string {
  const normalized = establishmentId.trim();
  return establishments.some((item) => item.id === normalized) ? normalized : "";
}

function updateUrlEstablishmentId(establishmentId: string): void {
  if (!establishmentId || typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("establishmentId", establishmentId);
  url.searchParams.delete("establishment_id");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

function parseTenants(payload: unknown): TenantOption[] {
  const raw = getPayloadItems(payload);

  return raw
    .map((item) => {
      const record = asApiRecord(item);
      return {
        id: String(record.id ?? "").trim(),
        name: String(record.name ?? record.slug ?? "Tenant").trim(),
        slug: nullableString(record.slug),
      };
    })
    .filter((item: TenantOption) => item.id);
}

function parseEstablishments(payload: unknown): EstablishmentItem[] {
  const record = asApiRecord(payload);
  const raw = Array.isArray(record.items) ? record.items : [];

  return raw
    .map((item) => {
      const itemRecord = asApiRecord(item);
      return {
        id: String(itemRecord.id ?? "").trim(),
        name: String(itemRecord.name ?? "Estabelecimento").trim(),
        city: nullableString(itemRecord.city),
        state: nullableString(itemRecord.state),
        employee_count:
          typeof itemRecord.employee_count === "number" && Number.isFinite(itemRecord.employee_count)
            ? itemRecord.employee_count
            : null,
        status: nullableString(itemRecord.status),
      };
    })
    .filter((item: EstablishmentItem) => item.id);
}

function parseEvidenceItems(payload: unknown): EvidenceItem[] {
  const record = asApiRecord(payload);
  const raw = Array.isArray(record.data)
    ? record.data
    : Array.isArray(record.items)
      ? record.items
      : Array.isArray(payload)
        ? payload
        : [];

  return raw
    .map((item) => {
      const itemRecord = asApiRecord(item);
      return {
        id: String(itemRecord.id ?? "").trim(),
        tenant_id: nullableString(itemRecord.tenant_id),
        establishment_id: nullableString(itemRecord.establishment_id),
        title: nullableString(itemRecord.title),
        evidence_type: nullableString(itemRecord.evidence_type),
        description: nullableString(itemRecord.description),
        linked_entity_type: nullableString(itemRecord.linked_entity_type),
        linked_entity_id: nullableString(itemRecord.linked_entity_id),
        reference_date: nullableString(itemRecord.reference_date),
        file_name: nullableString(itemRecord.file_name),
        file_url: nullableString(itemRecord.file_url),
        validation_status: nullableString(itemRecord.validation_status),
        responsible_name: nullableString(itemRecord.responsible_name),
        created_at: nullableString(itemRecord.created_at),
        updated_at: nullableString(itemRecord.updated_at),
        deleted_at: nullableString(itemRecord.deleted_at),
      };
    })
    .filter((item: EvidenceItem) => item.id);
}

const psychosocialFactorLabelDisplayMap: Record<string, string> = {
  has_badly_managed_change: "Mudança mal gerida",
  has_communication_difficulty: "Dificuldade de comunicação",
  has_constant_interruptions: "Interrupções constantes",
  has_excessive_pressure: "Pressão excessiva",
  has_hostile_public_contact: "Contato hostil com público",
  has_leadership_support_failure: "Falha de apoio da liderança",
  has_low_autonomy: "Baixa autonomia",
  has_peer_conflict: "Conflito entre pares",
  has_remote_isolation: "Isolamento remoto",
  has_report_channel: "Canal de relato",
  has_role_ambiguity: "Ambiguidade de papel",
  has_task_accumulation: "Acúmulo de tarefas",
  has_work_overload: "Sobrecarga de trabalho",
};

function getPsychosocialFactorDisplayLabel(item: PsychosocialFactorItem): string {
  return psychosocialFactorLabelDisplayMap[item.factor_key] || getPsychosocialFactorDisplayLabel(item);
}
function parsePsychosocialFactors(payload: unknown): PsychosocialFactorItem[] {
  const record = asApiRecord(payload);
  const item = asApiRecord(record.item);
  const raw = Array.isArray(item.factors) ? item.factors : [];

  return raw
    .map((factor) => {
      const factorRecord = asApiRecord(factor);

      return {
        id: String(factorRecord.id ?? "").trim(),
        factor_key: nullableString(factorRecord.factor_key),
        factor_label: nullableString(factorRecord.factor_label),
        status: nullableString(factorRecord.status),
        confidence_level: nullableString(factorRecord.confidence_level),
        evidence_summary: nullableString(factorRecord.evidence_summary),
        justification: nullableString(factorRecord.justification),
        investigation_pending:
          typeof factorRecord.investigation_pending === "boolean" ? factorRecord.investigation_pending : null,
        pending_action: nullableString(factorRecord.pending_action),
      };
    })
    .filter((factor: PsychosocialFactorItem) => factor.id);
}

function getPsychosocialFactorStatusLabel(status: string | null | undefined): string {
  switch (String(status || "").trim().toLowerCase()) {
    case "evidence_found":
      return "Evidência encontrada";
    case "not_observed":
      return "Não observado";
    default:
      return "A verificar";
  }
}

function getPsychosocialFactorStatusClassName(status: string | null | undefined): string {
  switch (String(status || "").trim().toLowerCase()) {
    case "evidence_found":
      return "border-[#E9D4C4] bg-[#FBF5EF] text-[#8C5A33]";
    case "not_observed":
      return "border-[#D6E5D7] bg-[#F3F8F4] text-[#4E7355]";
    default:
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
  }
}

function formatValidationStatus(value: string | null | undefined) {
  switch (String(value || "").trim().toLowerCase()) {
    case "pending_validation":
      return "pendente de validacao";
    case "validated":
      return "validado";
    case "rejected":
      return "rejeitado";
    case "archived":
      return "arquivado";
    default:
      return String(value || "sem status").trim() || "sem status";
  }
}

function getValidationBadgeClass(value: string | null | undefined) {
  switch (String(value || "").trim().toLowerCase()) {
    case "validated":
      return "border-[#D6E5D7] bg-[#F3F8F4] text-[#4E7355]";
    case "pending_validation":
      return "border-[#E9D4C4] bg-[#FBF5EF] text-[#8C5A33]";
    case "rejected":
      return "border-[#E8C8CC] bg-[#F9F1F2] text-[#8A4F58]";
    case "archived":
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
    default:
      return "border-[#D9E0E7] bg-[#FAFBFC] text-[#5B6B79]";
  }
}

export default function Nr1EvidenciasAcompanhamentoPage() {
  return (
    <Suspense fallback={null}>
      <Nr1EvidenciasAcompanhamentoContent />
    </Suspense>
  );
}

function Nr1EvidenciasAcompanhamentoContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentItem[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [psychosocialFactors, setPsychosocialFactors] = useState<PsychosocialFactorItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingPsychosocialFactors, setLoadingPsychosocialFactors] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [archivingEvidenceId, setArchivingEvidenceId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    evidence_type: "document",
    description: "",
    linked_entity_type: "",
    linked_entity_id: "",
    reference_date: "",
    file_name: "",
    file_url: "",
    validation_status: "pending_validation",
    responsible_name: "",
  });

  const selectedEstablishment = useMemo(() => {
    return establishments.find((item) => item.id === selectedEstablishmentId) || null;
  }, [establishments, selectedEstablishmentId]);

  const selectedTenant = useMemo(() => {
    return tenants.find((item) => item.id === tenantId) || null;
  }, [tenants, tenantId]);

  const urlEstablishmentId = useMemo(() => {
    return (searchParams.get("establishmentId") || searchParams.get("establishment_id") || "").trim();
  }, [searchParams]);

  const urlDiagnosisSessionId = useMemo(() => {
    return (
      searchParams.get("diagnosisSessionId") ||
      searchParams.get("diagnosis_session_id") ||
      searchParams.get("sessionId") ||
      ""
    ).trim();
  }, [searchParams]);


  useEffect(() => {
    if (!urlDiagnosisSessionId) {
      return;
    }

    // Sincroniza o vínculo formal exigido pelo banco quando a tela vem da sessão de diagnóstico.
    setForm((current) => {
      const currentType = current.linked_entity_type.trim();
      const currentId = current.linked_entity_id.trim();

      if (currentType === "diagnosis_session" && currentId === urlDiagnosisSessionId) {
        return current;
      }

      if (currentType && isValidEvidenceLinkedEntityType(currentType) && currentId) {
        return current;
      }

      return {
        ...current,
        linked_entity_type: "diagnosis_session",
        linked_entity_id: urlDiagnosisSessionId,
      };
    });
  }, [urlDiagnosisSessionId]);
const pendingValidationCount = useMemo(() => {
    return items.filter((item) => String(item.validation_status || "").trim().toLowerCase() === "pending_validation").length;
  }, [items]);

  const linkedActionPlanCount = useMemo(() => {
    return items.filter((item) => String(item.linked_entity_type || "").trim().toLowerCase() === "action_plan").length;
  }, [items]);

  const linkedFollowupCount = useMemo(() => {
    return items.filter((item) => String(item.linked_entity_type || "").trim().toLowerCase() === "action_followup").length;
  }, [items]);

  useEffect(() => {
    (async () => {
      setLoadingSession(true);
      setError("");
      setInfo("");

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          router.replace("/login?next=" + encodeURIComponent(pathname || "/dashboard"));
          return;
        }

        setJwt(accessToken);

        const tenantsResponse = await fetch("/api/tenants", {
          method: "GET",
          headers: {
            Authorization: "Bearer " + accessToken,
          },
          cache: "no-store",
        });

        const tenantsPayload = await readJsonSafe(tenantsResponse);

        if (!tenantsResponse.ok) {
          throw new Error(getErrorMessage(tenantsPayload, "Falha ao carregar tenants."));
        }

        const parsedTenants = parseTenants(tenantsPayload);
        setTenants(parsedTenants);

        if (parsedTenants.length === 0) {
          throw new Error("Nenhum tenant encontrado para esta sessao.");
        }

        setTenantId(parsedTenants[0].id);
      } catch (e: unknown) {
        setError(getExceptionMessage(e, "Falha ao carregar sessão."));
      } finally {
        setLoadingSession(false);
      }
    })();
  }, [pathname, router]);

  useEffect(() => {
    if (!jwt || !tenantId) {
      return;
    }

    (async () => {
      setLoadingEstablishments(true);
      setError("");
      setInfo("");

      try {
        const response = await fetch("/api/nr1/establishments", {
          method: "GET",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
          },
          cache: "no-store",
        });

        const payload = await readJsonSafe(response);

        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "Falha ao carregar estabelecimentos."));
        }

        const parsedEstablishments = parseEstablishments(payload);
        setEstablishments(parsedEstablishments);

        if (parsedEstablishments.length === 0) {
          setSelectedEstablishmentId("");
          setInfo("Nenhum estabelecimento encontrado para este tenant.");
          return;
        }

        const nextSelectedEstablishmentId =
          findValidEstablishmentId(parsedEstablishments, urlEstablishmentId) ||
          findValidEstablishmentId(parsedEstablishments, getStoredWorkspaceEstablishmentId(tenantId)) ||
          parsedEstablishments[0].id;

        setSelectedEstablishmentId(nextSelectedEstablishmentId);
      } catch (e: unknown) {
        setError(getExceptionMessage(e, "Falha ao carregar estabelecimentos."));
      } finally {
        setLoadingEstablishments(false);
      }
    })();
  }, [jwt, tenantId, urlEstablishmentId]);

  useEffect(() => {
    if (!jwt || !tenantId || !selectedEstablishmentId) {
      setItems([]);
      return;
    }

    (async () => {
      setLoadingItems(true);
      setError("");
      setInfo("");

      try {
        const response = await fetch(
          "/api/nr1/evidence-items?establishmentId=" + encodeURIComponent(selectedEstablishmentId),
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + jwt,
              "x-icanhelp-tenant": tenantId,
            },
            cache: "no-store",
          }
        );

        const payload = await readJsonSafe(response);

        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "Falha ao carregar evidencias do estabelecimento."));
        }

        const parsedItems = parseEvidenceItems(payload);
        setItems(parsedItems);

        if (parsedItems.length === 0) {
          setInfo("Nenhuma evidência encontrada para este estabelecimento.");
        } else {
          setInfo("Tela ligada ao sistema de evidências por estabelecimento.");
        }
      } catch (e: unknown) {
        setItems([]);
        setError(getExceptionMessage(e, "Falha ao carregar evidencias."));
      } finally {
        setLoadingItems(false);
      }
    })();
  }, [jwt, tenantId, selectedEstablishmentId]);


  useEffect(() => {
    if (!jwt || !tenantId || !selectedEstablishmentId || !urlDiagnosisSessionId) {
      setPsychosocialFactors([]);
      return;
    }

    (async () => {
      setLoadingPsychosocialFactors(true);

      try {
        const response = await fetch(
          "/api/nr1/diagnosis-psychosocial?tenantId=" +
            encodeURIComponent(tenantId) +
            "&establishmentId=" +
            encodeURIComponent(selectedEstablishmentId) +
            "&diagnosisSessionId=" +
            encodeURIComponent(urlDiagnosisSessionId),
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + jwt,
              "x-icanhelp-tenant": tenantId,
            },
            cache: "no-store",
            credentials: "same-origin",
          },
        );

        const payload = await readJsonSafe(response);

        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "Falha ao carregar fatores psicossociais."));
        }

        setPsychosocialFactors(parsePsychosocialFactors(payload));
      } catch (e: unknown) {
        setPsychosocialFactors([]);
        setError(getExceptionMessage(e, "Falha ao carregar fatores psicossociais."));
      } finally {
        setLoadingPsychosocialFactors(false);
      }
    })();
  }, [jwt, tenantId, selectedEstablishmentId, urlDiagnosisSessionId]);

  async function handleCreateEvidence() {
    setError("");
    setInfo("");

    if (!jwt || !tenantId || !selectedEstablishmentId) {
      setError("Contexto incompleto. Recarregue a página e confirme tenant e estabelecimento.");
      return;
    }

    if (!form.title.trim()) {
      setError("Informe o título da evidência.");
      return;
    }

    if (!form.evidence_type.trim()) {
      setError("Informe o tipo da evidência.");
      return;
    }

    const linkedEntityType =
      form.linked_entity_type.trim() || (urlDiagnosisSessionId ? "diagnosis_session" : "");
    const linkedEntityId =
      form.linked_entity_id.trim() ||
      (linkedEntityType === "diagnosis_session" ? urlDiagnosisSessionId : "");

    if (!isValidEvidenceLinkedEntityType(linkedEntityType)) {
      setError("Selecione um vínculo válido para a evidência.");
      return;
    }

    if (!linkedEntityId) {
      setError("Informe o ID vinculado antes de salvar a evidência.");
      return;
    }

    setSaving(true);

    try {
      const createResponse = await fetch("/api/nr1/evidence-items?tenantId=" + encodeURIComponent(tenantId), {
        method: "POST",
        headers: {
          Authorization: "Bearer " + jwt,
          "x-icanhelp-tenant": tenantId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          title: form.title.trim(),
          evidence_type: form.evidence_type.trim(),
          description: form.description.trim() || null,
          linked_entity_type: linkedEntityType,
          linked_entity_id: linkedEntityId,
          reference_date: form.reference_date.trim() || null,
          file_name: form.file_name.trim() || null,
          file_url: form.file_url.trim() || null,
          validation_status: form.validation_status.trim() || null,
          responsible_name: form.responsible_name.trim() || null,
        }),
      });

      const createPayload = await readJsonSafe(createResponse);

      if (!createResponse.ok) {
        throw new Error(getErrorMessage(createPayload, "Falha ao gravar evidência no backend real."));
      }

      const refreshResponse = await fetch(
        "/api/nr1/evidence-items?establishmentId=" + encodeURIComponent(selectedEstablishmentId),
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
          },
          cache: "no-store",
        }
      );

      const refreshPayload = await readJsonSafe(refreshResponse);

      if (!refreshResponse.ok) {
        throw new Error(getErrorMessage(refreshPayload, "A evidência foi criada, mas a releitura da lista falhou."));
      }

      setItems(parseEvidenceItems(refreshPayload));
      setForm({
        title: "",
        evidence_type: "document",
        description: "",
        linked_entity_type: urlDiagnosisSessionId ? "diagnosis_session" : "",
        linked_entity_id: urlDiagnosisSessionId || "",
        reference_date: "",
        file_name: "",
        file_url: "",
        validation_status: "pending_validation",
        responsible_name: "",
      });
      setInfo("Evidência gravada com sucesso no backend real.");
    } catch (e: unknown) {
      setError(getExceptionMessage(e, "Falha ao gravar evidência."));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveEvidence(item: EvidenceItem) {
    setError("");
    setInfo("");

    if (!jwt || !tenantId || !selectedEstablishmentId) {
      setError("Contexto incompleto. Recarregue a página e confirme tenant e estabelecimento.");
      return;
    }

    if (!item.id) {
      setError("Evidência sem identificador válido para arquivamento.");
      return;
    }

    const confirmed = window.confirm(
      "Arquivar esta evidência? Ela deixará de aparecer na lista principal, mas continuará registrada para rastreabilidade."
    );

    if (!confirmed) {
      return;
    }

    setArchivingEvidenceId(item.id);

    try {
      const archiveResponse = await fetch("/api/nr1/evidence-items?tenantId=" + encodeURIComponent(tenantId), {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + jwt,
          "x-icanhelp-tenant": tenantId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          establishment_id: selectedEstablishmentId,
          action: "archive",
        }),
      });

      const archivePayload = await readJsonSafe(archiveResponse);

      if (!archiveResponse.ok) {
        throw new Error(getErrorMessage(archivePayload, "Falha ao arquivar evidência."));
      }

      const refreshResponse = await fetch(
        "/api/nr1/evidence-items?establishmentId=" + encodeURIComponent(selectedEstablishmentId),
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
          },
          cache: "no-store",
        }
      );

      const refreshPayload = await readJsonSafe(refreshResponse);

      if (!refreshResponse.ok) {
        throw new Error(getErrorMessage(refreshPayload, "A evidência foi arquivada, mas a releitura da lista falhou."));
      }

      setItems(parseEvidenceItems(refreshPayload));
      setInfo("Evidência arquivada com sucesso.");
    } catch (e: unknown) {
      setError(getExceptionMessage(e, "Falha ao arquivar evidência."));
    } finally {
      setArchivingEvidenceId(null);
    }
  }

  function handleSelectedEstablishmentChange(establishmentId: string) {
    setSelectedEstablishmentId(establishmentId);
    setStoredWorkspaceEstablishmentId(tenantId, establishmentId);
    updateUrlEstablishmentId(establishmentId);
  }

  return (
    <Nr1WorkspaceV2Shell
      companyName={selectedTenant?.name || "Empresa não selecionada"}
      establishmentName={selectedEstablishment?.name || "Unidade não selecionada"}
      pgrStatus="Em construção"
      progressPercent={75}
      progressDescription="Evidências e acompanhamento documental em execução."
      activeModule="Evidências"
      pendingItems={[
        "Validar evidências do estabelecimento",
        "Conferir fatores psicossociais derivados",
        "Manter rastreabilidade para o PGR",
      ]}
      nextBestActionLabel="Etapa da jornada"
      nextBestActionTitle="Validar evidências e fatores psicossociais"
      nextBestActionDescription="Revise os registros documentais e os fatores organizacionais derivados da sessão de diagnóstico. Esta etapa apoia o GRO/PGR sem fazer diagnóstico clínico individual."
      nextBestActionPrimaryHref="#evidencias-operational-content"
      nextBestActionPrimaryLabel="Ver evidências"
      nextBestActionSecondaryHref="/dashboard/nr1/workspace"
      nextBestActionSecondaryLabel="Voltar ao workspace"
      nextBestActionReasons={[
        "As evidências sustentam o inventário de riscos.",
        "Os fatores psicossociais devem permanecer ligados à organização do trabalho.",
        "A rastreabilidade documental fortalece o PGR.",
      ]}
      pgrHref="/dashboard/nr1/relatorio-pgr"
      moduleHref="#evidencias-operational-content"
    >
      <section id="evidencias-operational-content" className="min-w-0 space-y-6">
        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            o que esta tela faz
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
            Mostra evidências reais do estabelecimento, com status, vínculo e rastreabilidade.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5B6B79]">
            Esta etapa registra e consulta evidências documentais reais do estabelecimento. O acompanhamento detalhado das ações segue em tela própria.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                evidências
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{items.length}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                pendentes
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{pendingValidationCount}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                ligadas à ação
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{linkedActionPlanCount}</div>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5E7A96]">
                ligadas ao acompanhamento
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#22313F]">{linkedFollowupCount}</div>
            </div>
          </div>

          {loadingSession ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">Carregando sessão...</p>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-[#E8C8CC] bg-[#F9F1F2] px-4 py-3 text-sm text-[#8A4F58]">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="mt-4 rounded-2xl border border-[#D6E3EE] bg-[#F2F7FB] px-4 py-3 text-sm text-[#45647F]">
              {info}
            </div>
          ) : null}
        </section>

        <section className={sectionClassName}>
          <div className="grid gap-4 md:grid-cols-[1.2fr_2fr]">
            <div>
              <label className="text-sm font-semibold text-[#22313F]">Empresa ativa</label>
              <div className="mt-2 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm text-[#5B6B79]">
                {tenantId
                  ? (tenants.find((item) => item.id === tenantId)?.name || tenantId) + " (" + tenantId + ")"
                  : "Não carregado"}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Estabelecimento selecionado</label>
              <select
                value={selectedEstablishmentId}
                onChange={(e) => handleSelectedEstablishmentChange(e.target.value)}
                className={inputClassName}
                disabled={loadingEstablishments || establishments.length === 0}
              >
                {establishments.length === 0 ? (
                  <option value="">Nenhum estabelecimento</option>
                ) : (
                  establishments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.id})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {selectedEstablishment ? (
            <div className="mt-4 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
              <div>
                <span className="font-semibold text-[#22313F]">Estabelecimento:</span> {selectedEstablishment.name}
              </div>
              <div>
                <span className="font-semibold text-[#22313F]">Cidade/UF:</span>{" "}
                {[selectedEstablishment.city, selectedEstablishment.state].filter(Boolean).join(" / ") || "Não informado"}
              </div>
              <div>
                <span className="font-semibold text-[#22313F]">Status:</span> {selectedEstablishment.status === "active" ? "Ativo" : selectedEstablishment.status || "Não informado"}
              </div>
            </div>
          ) : null}
        </section>

        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            registrar evidência
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
            Criação manual de evidência documental.
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-[#22313F]">Título da evidência</label>
              <input
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                className={inputClassName}
                placeholder="Ex.: Checklist assinado da verificação"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Tipo</label>
              <select
                value={form.evidence_type}
                onChange={(e) => setForm((current) => ({ ...current, evidence_type: e.target.value }))}
                className={inputClassName}
              >
                <option value="document">Documento</option>
                <option value="image">Imagem</option>
                <option value="checklist">Checklist</option>
                <option value="report">Relatório</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Data de referência</label>
              <input
                type="date"
                value={form.reference_date}
                onChange={(e) => setForm((current) => ({ ...current, reference_date: e.target.value }))}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Responsável</label>
              <input
                value={form.responsible_name}
                onChange={(e) => setForm((current) => ({ ...current, responsible_name: e.target.value }))}
                className={inputClassName}
                placeholder="Nome do responsável"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Entidade vinculada</label>
              <select
                    className={inputClassName}
                    value={form.linked_entity_type}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      setForm({
                        ...form,
                        linked_entity_type: nextType,
                        linked_entity_id:
                          nextType === "diagnosis_session" && urlDiagnosisSessionId
                            ? urlDiagnosisSessionId
                            : "",
                      });
                    }}
                  >
                    <option value="diagnosis_session">Diagnóstico</option>
                    <option value="risk">Risco</option>
                    <option value="action_plan">Plano de ação</option>
                    <option value="review_cycle">Ciclo de revisão</option>
                    <option value="training_record">Treinamento</option>
                    <option value="third_party">Terceiro</option>
                  </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Identificador vinculado</label>
              <input
                value={form.linked_entity_id}
                onChange={(e) => setForm((current) => ({ ...current, linked_entity_id: e.target.value }))}
                className={inputClassName}
                placeholder={form.linked_entity_type === "diagnosis_session" ? "ID da sessão de diagnóstico" : "ID do item vinculado"}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Nome do arquivo</label>
              <input
                value={form.file_name}
                onChange={(e) => setForm((current) => ({ ...current, file_name: e.target.value }))}
                className={inputClassName}
                placeholder="arquivo.pdf"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">URL do arquivo</label>
              <input
                value={form.file_url}
                onChange={(e) => setForm((current) => ({ ...current, file_url: e.target.value }))}
                className={inputClassName}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#22313F]">Status de validação</label>
              <select
                value={form.validation_status}
                onChange={(e) => setForm((current) => ({ ...current, validation_status: e.target.value }))}
                className={inputClassName}
              >
                <option value="pending_validation">Pendente de validação</option>
                <option value="validated">Validada</option>
                <option value="rejected">Rejeitada</option>
                <option value="archived">Arquivada</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-[#22313F]">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                className={inputClassName + " min-h-[120px]"}
                placeholder="Descreva a evidência e o contexto do registro"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCreateEvidence()}
              disabled={saving || !jwt || !tenantId || !selectedEstablishmentId || !form.title.trim() || !form.evidence_type.trim()}
              className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar evidência"}
            </button>

            <button
              type="button"
              onClick={() =>
                setForm({
                  title: "",
                  evidence_type: "document",
                  description: "",
                  linked_entity_type: "",
                  linked_entity_id: "",
                  reference_date: "",
                  file_name: "",
                  file_url: "",
                  validation_status: "pending_validation",
                  responsible_name: "",
                })
              }
              className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
            >
              Limpar campos
            </button>
          </div>
        </section>

        <section className={sectionClassName}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8C5A33]">Diagnóstico psicossocial</p>
              <h2 className="mt-2 text-xl font-semibold text-[#22313F]">Fatores derivados gravados</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#5B6B79]">
                Esta leitura mostra os fatores psicossociais já gravados no sistema para a sessão de diagnóstico informada na URL.
                O foco é organizacional: concepção, organização e gestão do trabalho, sem análise clínica individual.
              </p>
            </div>

            <div className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-3 text-sm text-[#5B6B79]">
              Sessão: <span className="font-mono text-xs text-[#22313F]">{urlDiagnosisSessionId || "não informada"}</span>
            </div>
          </div>

          {!urlDiagnosisSessionId ? (
            <p className="mt-4 text-sm leading-7 text-[#8C5A33]">
              Informe diagnosisSessionId na URL para carregar os fatores psicossociais desta etapa.
            </p>
          ) : loadingPsychosocialFactors ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Buscando fatores psicossociais...
            </p>
          ) : psychosocialFactors.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Nenhum fator psicossocial retornado para a sessão informada.
            </p>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {psychosocialFactors.map((factor) => (
                <article key={factor.id} className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#22313F]">
                        {getPsychosocialFactorDisplayLabel(factor)}
                      </h3>
                      <p className="mt-1 font-mono text-[11px] text-[#7A8894]">{factor.factor_key || "sem_chave"}</p>
                    </div>

                    <span
                      className={
                        "rounded-full border px-3 py-1 text-xs font-semibold " +
                        getPsychosocialFactorStatusClassName(factor.status)
                      }
                    >
                      {getPsychosocialFactorStatusLabel(factor.status)}
                    </span>
                  </div>

                  {factor.evidence_summary ? (
                    <p className="mt-3 text-sm leading-6 text-[#5B6B79]">{factor.evidence_summary}</p>
                  ) : null}

                  {factor.investigation_pending ? (
                    <p className="mt-3 text-sm font-semibold text-[#8C5A33]">
                      Investigação pendente{factor.pending_action ? ": " + factor.pending_action : ""}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={sectionClassName}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            evidências reais
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
            Evidências documentais vinculadas ao estabelecimento.
          </h3>


          {loadingItems ? (


            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">


              Buscando evidências registradas...
            </p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-[#5B6B79]">
              Nenhuma evidência encontrada para o estabelecimento selecionado.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5E7A96]">
                        evidência {index + 1}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-[#22313F]">
                        {item.title || "Evidência sem título"}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#5B6B79]">
                        {item.description || "Sem descrição complementar."}
                      </p>
                    </div>

                    <div className="rounded-full border px-3 py-2 text-xs font-semibold border-[#D9E0E7] bg-white text-[#5B6B79]">
                      Tipo: {item.evidence_type || "Não informado"}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className={"rounded-full border px-3 py-2 text-xs font-semibold " + getValidationBadgeClass(item.validation_status)}>
                      Validação: {formatValidationStatus(item.validation_status)}
                    </div>

                    <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#5B6B79]">
                      Referência: {item.reference_date || "Não informada"}
                    </div>

                    <div className="rounded-full border border-[#D9E0E7] bg-white px-3 py-2 text-xs font-semibold text-[#5B6B79]">
                      Responsável: {item.responsible_name || "Não informado"}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        Entidade vinculada
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.linked_entity_type || "Não informada"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        ID vinculado
                      </div>
                      <div className="mt-2 break-all text-sm leading-7 text-[#22313F]">
                        {item.linked_entity_id || "Não informado"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        Arquivo
                      </div>
                      <div className="mt-2 break-all text-sm leading-7 text-[#22313F]">
                        {item.file_name || item.file_url || "Não informado"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5E7A96]">
                        Atualização
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[#22313F]">
                        {item.updated_at || item.created_at || "Não informada"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => void handleArchiveEvidence(item)}
                      disabled={archivingEvidenceId !== null || !jwt || !tenantId || !selectedEstablishmentId}
                      className="rounded-xl border border-[#E8C8CC] bg-white px-4 py-2 text-xs font-semibold text-[#8A4F58] transition hover:bg-[#F9F1F2] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {archivingEvidenceId === item.id ? "Arquivando..." : "Arquivar evidência"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
            Esta tela usa registros reais de evidências, com leitura e gravação por estabelecimento. O detalhamento dos acompanhamentos segue na trilha própria.
          </div>
        </section>

        <section className={sectionClassName}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
                navegação da jornada
              </div>
              <h3 className="mt-3 text-xl font-semibold text-[#22313F]">
                Acompanhamento documental ligado ao estabelecimento selecionado.
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/nr1/plano-de-acao"
                className="rounded-xl border border-[#D9E0E7] bg-[#FAFBFC] px-5 py-3 text-sm font-semibold text-[#22313F]"
              >
                Voltar para plano de ação
              </Link>

              <Link
                href="/dashboard/nr1/trilha-acompanhamento"
                className="rounded-xl bg-[#5E7A96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86]"
              >
                Avançar para trilha
              </Link>
            </div>
          </div>
        </section>
      </section>
    </Nr1WorkspaceV2Shell>
  );
}
