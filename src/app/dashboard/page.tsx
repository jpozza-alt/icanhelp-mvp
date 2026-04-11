"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { TopBar } from "../../components/TopBar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TenantOption = {
  id: string;
  name: string;
  slug?: string | null;
};

type KnowledgeItemRow = {
  id: string;
  domain: string;
  category: string;
  title: string;
  summary: string | null;
  status: string;
  version: number;
  updated_at: string;
};

type KnowledgeItemDetail = {
  id: string;
  tenant_id: string;
  domain: string;
  category: string;
  title: string;
  summary: string | null;
  body: string;
  foundation_type: string | null;
  foundation_reference: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
};

type CreateFormState = {
  domain: string;
  category: string;
  title: string;
  summary: string;
  body: string;
  foundation_type: string;
  foundation_reference: string;
  status: string;
};

type EditFormState = {
  domain: string;
  category: string;
  title: string;
  summary: string;
  body: string;
  foundation_type: string;
  foundation_reference: string;
  status: string;
};

const INITIAL_FORM: CreateFormState = {
  domain: "organizational",
  category: "general",
  title: "",
  summary: "",
  body: "",
  foundation_type: "",
  foundation_reference: "",
  status: "draft",
};

const INITIAL_EDIT_FORM: EditFormState = {
  domain: "organizational",
  category: "",
  title: "",
  summary: "",
  body: "",
  foundation_type: "",
  foundation_reference: "",
  status: "draft",
};

function parseTenants(payload: any): TenantOption[] {
  const raw =
    (Array.isArray(payload) && payload) ||
    (Array.isArray(payload?.tenants) && payload.tenants) ||
    (Array.isArray(payload?.items) && payload.items) ||
    (Array.isArray(payload?.data) && payload.data) ||
    [];

  return raw
    .map((item: any) => ({
      id: String(item?.id ?? item?.tenant_id ?? "").trim(),
      name: String(item?.name ?? item?.tenant_name ?? item?.slug ?? "Tenant").trim(),
      slug: item?.slug ? String(item.slug) : null,
    }))
    .filter((item: TenantOption) => item.id);
}

function parseKnowledgeItems(payload: any): KnowledgeItemRow[] {
  const raw =
    (Array.isArray(payload) && payload) ||
    (Array.isArray(payload?.items) && payload.items) ||
    (Array.isArray(payload?.data) && payload.data) ||
    [];

  return raw.map((item: any) => ({
    id: String(item?.id ?? ""),
    domain: String(item?.domain ?? ""),
    category: String(item?.category ?? ""),
    title: String(item?.title ?? ""),
    summary: item?.summary ? String(item.summary) : null,
    status: String(item?.status ?? ""),
    version: Number(item?.version ?? 0),
    updated_at: String(item?.updated_at ?? ""),
  }));
}

function parseKnowledgeItemDetail(payload: any): KnowledgeItemDetail | null {
  const item = payload?.item ?? payload?.data ?? null;
  if (!item || !item.id) return null;

  return {
    id: String(item.id),
    tenant_id: String(item.tenant_id ?? ""),
    domain: String(item.domain ?? ""),
    category: String(item.category ?? ""),
    title: String(item.title ?? ""),
    summary: item.summary ? String(item.summary) : null,
    body: String(item.body ?? ""),
    foundation_type: item.foundation_type ? String(item.foundation_type) : null,
    foundation_reference: item.foundation_reference ? String(item.foundation_reference) : null,
    status: String(item.status ?? ""),
    version: Number(item.version ?? 0),
    created_at: String(item.created_at ?? ""),
    updated_at: String(item.updated_at ?? ""),
  };
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export default function DashboardPage() {
  const router = useRouter();

  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [items, setItems] = useState<KnowledgeItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<KnowledgeItemDetail | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(INITIAL_EDIT_FORM);

  const loadItems = useCallback(async (token: string, selectedTenantId: string) => {
    const response = await fetch("/api/knowledge-items?limit=20", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        "x-icanhelp-tenant": selectedTenantId,
      },
      cache: "no-store",
    });

    const payload = await readJsonSafe(response);

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        "Falha ao carregar knowledge-items.";
      throw new Error(String(message));
    }

    setItems(parseKnowledgeItems(payload));
  }, []);

  const loadDetail = useCallback(
    async (token: string, selectedTenantId: string, id: string) => {
      const response = await fetch("/api/knowledge-items/" + id, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          "x-icanhelp-tenant": selectedTenantId,
        },
        cache: "no-store",
      });

      const payload = await readJsonSafe(response);

      if (!response.ok) {
        const message =
          payload?.message ||
          payload?.error ||
          "Falha ao carregar detalhe do knowledge-item.";
        throw new Error(String(message));
      }

      const detail = parseKnowledgeItemDetail(payload);
      if (!detail) {
        throw new Error("Detalhe do knowledge-item nao retornou item valido.");
      }

      setSelectedDetail(detail);
      setEditForm({
        domain: detail.domain,
        category: detail.category,
        title: detail.title,
        summary: detail.summary || "",
        body: detail.body,
        foundation_type: detail.foundation_type || "",
        foundation_reference: detail.foundation_reference || "",
        status: detail.status,
      });
    },
    []
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        router.replace("/login");
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
        const message =
          tenantsPayload?.message ||
          tenantsPayload?.error ||
          "Falha ao carregar tenants.";
        throw new Error(String(message));
      }

      const parsedTenants = parseTenants(tenantsPayload);
      setTenants(parsedTenants);

      if (parsedTenants.length === 0) {
        setError("Nenhum tenant disponivel para este usuario.");
        setItems([]);
        return;
      }

      const firstTenant = parsedTenants[0];
      setTenantId(firstTenant.id);
      setTenantName(firstTenant.name);

      await loadItems(accessToken, firstTenant.id);
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }, [loadItems, router]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  async function handleRefresh() {
    if (!jwt || !tenantId) {
      setError("Sessao ou tenant indisponivel.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await loadItems(jwt, tenantId);

      if (selectedId) {
        try {
          await loadDetail(jwt, tenantId, selectedId);
        } catch {
          setSelectedId("");
          setSelectedDetail(null);
          setEditForm(INITIAL_EDIT_FORM);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Falha ao atualizar lista.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTenantChange(nextTenantId: string) {
    setTenantId(nextTenantId);
    setError("");
    setSuccess("");
    setSelectedId("");
    setSelectedDetail(null);
    setEditForm(INITIAL_EDIT_FORM);

    const selected = tenants.find((item) => item.id === nextTenantId);
    setTenantName(selected?.name || "");

    if (!jwt || !nextTenantId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      await loadItems(jwt, nextTenantId);
    } catch (e: any) {
      setError(e?.message || "Falha ao trocar tenant.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!jwt || !tenantId) {
      setError("Sessao ou tenant indisponivel.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/knowledge-items", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + jwt,
          "x-icanhelp-tenant": tenantId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: form.domain,
          category: form.category,
          title: form.title,
          summary: form.summary || null,
          body: form.body,
          foundation_type: form.foundation_type || null,
          foundation_reference: form.foundation_reference || null,
          status: form.status,
        }),
      });

      const payload = await readJsonSafe(response);

      if (!response.ok) {
        const message =
          payload?.message ||
          payload?.error ||
          "Falha ao criar knowledge-item.";
        throw new Error(String(message));
      }

      setForm(INITIAL_FORM);
      setSuccess("Knowledge-item criado com sucesso.");
      await loadItems(jwt, tenantId);
    } catch (e: any) {
      setError(e?.message || "Falha ao criar knowledge-item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenDetail(id: string) {
    if (!jwt || !tenantId) {
      setError("Sessao ou tenant indisponivel.");
      return;
    }

    setDetailLoading(true);
    setError("");
    setSuccess("");
    setSelectedId(id);

    try {
      await loadDetail(jwt, tenantId, id);
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar detalhe.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!jwt || !tenantId || !selectedId) {
      setError("Sessao, tenant ou item indisponivel.");
      return;
    }

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/knowledge-items/" + selectedId, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + jwt,
          "x-icanhelp-tenant": tenantId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: editForm.domain,
          category: editForm.category,
          title: editForm.title,
          summary: editForm.summary || null,
          body: editForm.body,
          foundation_type: editForm.foundation_type || null,
          foundation_reference: editForm.foundation_reference || null,
          status: editForm.status,
        }),
      });

      const payload = await readJsonSafe(response);

      if (!response.ok) {
        const message =
          payload?.message ||
          payload?.error ||
          "Falha ao atualizar knowledge-item.";
        throw new Error(String(message));
      }

      setSuccess("Knowledge-item atualizado com sucesso.");
      await loadItems(jwt, tenantId);
      await loadDetail(jwt, tenantId, selectedId);
    } catch (e: any) {
      setError(e?.message || "Falha ao atualizar knowledge-item.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!jwt || !tenantId || !selectedId) {
      setError("Sessao, tenant ou item indisponivel.");
      return;
    }

    const confirmed = window.confirm("Deseja excluir este knowledge-item?");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/knowledge-items/" + selectedId, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + jwt,
          "x-icanhelp-tenant": tenantId,
        },
      });

      const payload = await readJsonSafe(response);

      if (!response.ok) {
        const message =
          payload?.message ||
          payload?.error ||
          "Falha ao excluir knowledge-item.";
        throw new Error(String(message));
      }

      setSelectedId("");
      setSelectedDetail(null);
      setEditForm(INITIAL_EDIT_FORM);
      setSuccess("Knowledge-item excluido com sucesso.");
      await loadItems(jwt, tenantId);
    } catch (e: any) {
      setError(e?.message || "Falha ao excluir knowledge-item.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <TopBar />

      <div className="mx-auto max-w-7xl px-6 pb-10 pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dashboard - knowledge-items</h1>
          <p className="mt-2 text-sm text-gray-300">
            Interface minima com listagem, criacao, detalhe, edicao e exclusao.
          </p>
        </div>

        <div className="mb-6 grid gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Tenant ativo
            </label>
            <select
              value={tenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
            >
              {tenants.length === 0 && <option value="">Sem tenant</option>}
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Nome do tenant
            </label>
            <div className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm">
              {tenantName || "-"}
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRefresh}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700"
            >
              Atualizar lista
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md border border-green-900 bg-green-950 px-4 py-3 text-sm text-green-200">
            {success}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="mb-4 text-xl font-semibold">Criar knowledge-item</h2>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Domain</label>
                  <select
                    value={form.domain}
                    onChange={(e) => setForm((old) => ({ ...old, domain: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  >
                    <option value="organizational">organizational</option>
                    <option value="governmental">governmental</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((old) => ({ ...old, status: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  >
                    <option value="draft">draft</option>
                    <option value="approved">approved</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm((old) => ({ ...old, category: e.target.value }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  placeholder="general"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  placeholder="Titulo do knowledge-item"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">Summary</label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm((old) => ({ ...old, summary: e.target.value }))}
                  className="min-h-[80px] w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  placeholder="Resumo curto"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((old) => ({ ...old, body: e.target.value }))}
                  className="min-h-[180px] w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  placeholder="Conteudo principal"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Foundation type</label>
                  <input
                    value={form.foundation_type}
                    onChange={(e) => setForm((old) => ({ ...old, foundation_type: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                    placeholder="legal, metodologico, interno"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">Foundation reference</label>
                  <input
                    value={form.foundation_reference}
                    onChange={(e) => setForm((old) => ({ ...old, foundation_reference: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                    placeholder="NR-1 item 1.5.3.2.1"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Criar knowledge-item"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Lista de knowledge-items</h2>
              <span className="text-xs text-gray-400">
                {loading ? "Carregando..." : items.length + " item(ns)"}
              </span>
            </div>

            <div className="space-y-3">
              {!loading && items.length === 0 && (
                <div className="rounded-md border border-gray-800 bg-gray-950 px-4 py-4 text-sm text-gray-400">
                  Nenhum knowledge-item encontrado.
                </div>
              )}

              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-blue-950 px-2 py-1 text-xs text-blue-200">
                      {item.domain}
                    </span>
                    <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200">
                      {item.category}
                    </span>
                    <span className="rounded bg-amber-950 px-2 py-1 text-xs text-amber-200">
                      {item.status}
                    </span>
                    <span className="rounded bg-purple-950 px-2 py-1 text-xs text-purple-200">
                      v{item.version}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold">{item.title}</h3>

                  {item.summary && (
                    <p className="mt-2 text-sm text-gray-300">{item.summary}</p>
                  )}

                  <div className="mt-3 text-xs text-gray-500">
                    Atualizado em: {formatDate(item.updated_at)}
                  </div>

                  <div className="mt-2 break-all text-[11px] text-gray-600">
                    ID: {item.id}
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleOpenDetail(item.id)}
                      className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-600"
                    >
                      {detailLoading && selectedId === item.id ? "Abrindo..." : "Abrir detalhe"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Detalhe e edicao</h2>
            <span className="text-xs text-gray-400">
              {selectedDetail ? "ID selecionado: " + selectedDetail.id : "Nenhum item selecionado"}
            </span>
          </div>

          {!selectedDetail && (
            <div className="rounded-md border border-gray-800 bg-gray-950 px-4 py-4 text-sm text-gray-400">
              Clique em "Abrir detalhe" em um item da lista para editar ou excluir.
            </div>
          )}

          {selectedDetail && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-gray-800 bg-gray-950 px-3 py-3 text-sm">
                  <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Criado em</div>
                  <div>{formatDate(selectedDetail.created_at)}</div>
                </div>

                <div className="rounded-md border border-gray-800 bg-gray-950 px-3 py-3 text-sm">
                  <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Atualizado em</div>
                  <div>{formatDate(selectedDetail.updated_at)}</div>
                </div>

                <div className="rounded-md border border-gray-800 bg-gray-950 px-3 py-3 text-sm">
                  <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Versao</div>
                  <div>{selectedDetail.version}</div>
                </div>
              </div>

              <form onSubmit={handleUpdate} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-gray-300">Domain</label>
                    <select
                      value={editForm.domain}
                      onChange={(e) => setEditForm((old) => ({ ...old, domain: e.target.value }))}
                      className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                    >
                      <option value="organizational">organizational</option>
                      <option value="governmental">governmental</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-gray-300">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((old) => ({ ...old, status: e.target.value }))}
                      className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                    >
                      <option value="draft">draft</option>
                      <option value="approved">approved</option>
                      <option value="archived">archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">Category</label>
                  <input
                    value={editForm.category}
                    onChange={(e) => setEditForm((old) => ({ ...old, category: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">Title</label>
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((old) => ({ ...old, title: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">Summary</label>
                  <textarea
                    value={editForm.summary}
                    onChange={(e) => setEditForm((old) => ({ ...old, summary: e.target.value }))}
                    className="min-h-[80px] w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">Body</label>
                  <textarea
                    value={editForm.body}
                    onChange={(e) => setEditForm((old) => ({ ...old, body: e.target.value }))}
                    className="min-h-[200px] w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-gray-300">Foundation type</label>
                    <input
                      value={editForm.foundation_type}
                      onChange={(e) => setEditForm((old) => ({ ...old, foundation_type: e.target.value }))}
                      className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-gray-300">Foundation reference</label>
                    <input
                      value={editForm.foundation_reference}
                      onChange={(e) => setEditForm((old) => ({ ...old, foundation_reference: e.target.value }))}
                      className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={updating}
                    className="rounded-md bg-amber-600 px-4 py-2 font-semibold hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updating ? "Salvando..." : "Salvar alteracoes"}
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-md bg-red-700 px-4 py-2 font-semibold hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? "Excluindo..." : "Excluir item"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
