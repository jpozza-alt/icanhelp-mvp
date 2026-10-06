"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type TenantAccess = {
  id?: string;
  tenant_id?: string;
  name?: string | null;
  role?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
);

async function getAccessToken(): Promise<string> {
  const result = await supabase.auth.getSession();
  return result.data.session?.access_token || "";
}

export default function OnboardingPage() {
  const router = useRouter();

  const [organizationName, setOrganizationName] = useState("");
  const [accesses, setAccesses] = useState<TenantAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasOwnedTenant = accesses.some(
    (access) => access.role === "owner"
  );

  const loadAccesses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.replace("/login?next=%2Fonboarding");
        return;
      }

      const response = await fetch("/api/tenants", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Authorization: "Bearer " + accessToken,
        },
      });

      const payload = (await response.json().catch(() => [])) as unknown;

      if (!response.ok) {
        throw new Error("Não foi possível verificar seus acessos.");
      }

      setAccesses(Array.isArray(payload) ? (payload as TenantAccess[]) : []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar seus acessos."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAccesses();
  }, [loadAccesses]);

  async function activateTenant(
    tenantId: string,
    accessToken: string
  ): Promise<void> {
    const response = await fetch("/api/tenant/select", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: JSON.stringify({
        tenantId,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(
        payload.error || "Não foi possível ativar a organização."
      );
    }

    router.replace("/dashboard/nr1/workspace");
    router.refresh();
  }

  async function handleCreateOrganization(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    const name = organizationName.trim();

    if (name.length < 3) {
      setError("Informe o nome da empresa ou organização.");
      return;
    }

    setCreating(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.replace("/login?next=%2Fonboarding");
        return;
      }

      const response = await fetch("/api/tenants", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
        body: JSON.stringify({
          name,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        tenant_id?: string;
        id?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.message ||
            payload.error ||
            "Não foi possível criar o espaço da empresa."
        );
      }

      const tenantId = payload.tenant_id || payload.id || "";

      if (!tenantId) {
        throw new Error(
          "A organização foi criada sem identificador válido."
        );
      }

      setMessage("Espaço criado. Abrindo a jornada NR-1...");
      await activateTenant(tenantId, accessToken);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar o espaço da empresa."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleEnterExisting(access: TenantAccess) {
    setError("");
    setMessage("");

    try {
      const tenantId = access.tenant_id || access.id || "";
      const accessToken = await getAccessToken();

      if (!tenantId || !accessToken) {
        throw new Error("Acesso inválido.");
      }

      await activateTenant(tenantId, accessToken);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível abrir a organização."
      );
    }
  }

  return (
    <main className="min-h-dvh bg-[#f4efe7] px-5 py-8 text-[#10243e]">
      <div className="mx-auto w-full max-w-5xl">
        <header className="rounded-[1.8rem] bg-[#10243e] p-6 text-white shadow-lg md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#dcc27e]">
            Primeiro acesso
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Como você quer começar?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Sua conta de usuário já existe. Agora escolha conscientemente
            se deseja criar o espaço da sua empresa ou acessar uma
            organização que já esteja vinculada ao seu e-mail.
          </p>
        </header>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-[#d9c9b8] bg-white p-6">
            Verificando seus acessos...
          </div>
        ) : null}

        {!loading && accesses.length > 0 ? (
          <section className="mt-6 rounded-3xl border border-[#d9c9b8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Organizações disponíveis
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#52677e]">
              Estas são as organizações que já estão vinculadas ao seu usuário.
            </p>

            <div className="mt-4 grid gap-3">
              {accesses.map((access) => {
                const tenantId =
                  access.tenant_id || access.id || "";

                return (
                  <button
                    key={tenantId}
                    type="button"
                    onClick={() =>
                      void handleEnterExisting(access)
                    }
                    className="flex items-center justify-between rounded-2xl border border-[#d9c9b8] px-4 py-4 text-left transition hover:bg-[#f8f4ed]"
                  >
                    <span>
                      <span className="block font-semibold">
                        {access.name || "Organização"}
                      </span>

                      <span className="mt-1 block text-xs text-[#60718a]">
                        Perfil: {access.role || "membro"}
                      </span>
                    </span>

                    <span className="text-sm font-bold text-[#10243e]">
                      Entrar
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {!loading ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {!hasOwnedTenant ? (
              <section className="rounded-3xl border border-[#d9c9b8] bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#af8f45]">
                  Minha empresa
                </p>

                <h2 className="mt-3 text-2xl font-semibold">
                  Cadastrar minha empresa
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#52677e]">
                  Crie o espaço da sua própria organização. Somente
                  nesta ação você passará a ser responsável principal
                  por esse espaço.
                </p>

                <form
                  onSubmit={handleCreateOrganization}
                  className="mt-5 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="organization-name"
                      className="text-sm font-semibold"
                    >
                      Nome da empresa ou organização
                    </label>

                    <input
                      id="organization-name"
                      type="text"
                      value={organizationName}
                      onChange={(event) =>
                        setOrganizationName(event.target.value)
                      }
                      placeholder="Ex.: Empresa Exemplo LTDA"
                      className="mt-2 w-full rounded-2xl border border-[#d9c9b8] px-4 py-3 text-sm outline-none focus:border-[#10243e] focus:ring-4 focus:ring-[#10243e]/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      creating ||
                      organizationName.trim().length < 3
                    }
                    className="w-full rounded-2xl bg-[#10243e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#18365d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating
                      ? "Criando espaço..."
                      : "Criar espaço da minha empresa"}
                  </button>
                </form>
              </section>
            ) : (
              <section className="rounded-3xl border border-[#d9c9b8] bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#af8f45]">
                  Minha organização
                </p>

                <h2 className="mt-3 text-xl font-semibold">
                  Sua organização própria já está criada
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#52677e]">
                  Você já possui um espaço no qual é responsável
                  principal. Use a lista acima para acessá-lo.
                </p>
              </section>
            )}

            <section className="rounded-3xl border border-[#d9c9b8] bg-[#fffaf2] p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#af8f45]">
                Acessos existentes
              </p>

              <h2 className="mt-3 text-2xl font-semibold">
                Já tenho acesso a uma organização
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#52677e]">
                Se uma organização já vinculou este e-mail ao seu
                ambiente, ela aparecerá na lista de acessos.
              </p>

              <button
                type="button"
                onClick={() => void loadAccesses()}
                className="mt-5 w-full rounded-2xl border border-[#10243e]/20 bg-white px-5 py-3 text-sm font-bold text-[#10243e] transition hover:bg-[#f8f4ed]"
              >
                Atualizar meus acessos
              </button>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}