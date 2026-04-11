"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TenantOption = {
  id: string;
  name: string;
  slug?: string | null;
};

type ImportResult = {
  index: number;
  title: string;
  status: "PASS" | "FAIL";
  status_code: number | null;
  message: string;
};

const CLIMA_SEED = [
  {
    domain: "organizational",
    category: "climate_research",
    title: "Pesquisa de Clima Organizacional - objetivo e alcance",
    summary: "Define o que a pesquisa de clima pretende medir, para quem se aplica e o que nao deve ser confundido com avaliacao clinica individual.",
    body: "Objetivo:\nEstabelecer um entendimento comum sobre a finalidade da pesquisa de clima organizacional como instrumento de leitura do ambiente de trabalho, da lideranca e dos processos internos.\n\nAplicacao:\nA pesquisa deve ser usada para identificar percepcoes, pontos fortes, pontos de tensao e oportunidades de melhoria na organizacao do trabalho.\n\nLimites:\nA pesquisa nao deve ser tratada como diagnostico clinico individual, prontuario de saude mental ou ferramenta de exposicao pessoal do trabalhador.\n\nResultado esperado:\nGerar um retrato confiavel do ambiente interno para orientar acoes organizacionais, priorizacao e plano de melhoria.",
    foundation_type: "metodologico",
    foundation_reference: "Pasini - Pesquisa de Clima Organizacional",
    status: "draft",
  },
  {
    domain: "organizational",
    category: "climate_research",
    title: "Pesquisa de Clima Organizacional - planejamento da aplicacao",
    summary: "Organiza escopo, publico, cronograma, responsabilidades e forma de coleta antes da aplicacao.",
    body: "Passos minimos:\n1. Definir objetivo da rodada.\n2. Definir publico e setores abrangidos.\n3. Definir cronograma.\n4. Definir responsaveis pela conducao.\n5. Definir forma de coleta.\n6. Definir como sera feita a devolutiva.\n\nChecklist de preparo:\n- objetivo claro\n- publico definido\n- mensagens de abertura prontas\n- prazo de resposta definido\n- responsavel por consolidacao definido\n- compromisso de devolutiva assumido\n\nRisco a evitar:\nAplicar pesquisa sem plano de leitura e sem plano de acao posterior.",
    foundation_type: "metodologico",
    foundation_reference: "Pasini - Estruturacao de diagnosticos organizacionais",
    status: "draft",
  },
  {
    domain: "organizational",
    category: "climate_research",
    title: "Pesquisa de Clima Organizacional - comunicacao, adesao e confianca",
    summary: "Orienta a comunicacao com trabalhadores para aumentar adesao e confianca no processo.",
    body: "Mensagem central:\nA equipe precisa entender para que serve a pesquisa, como os dados serao usados e quais garantias de confidencialidade existem.\n\nBoas praticas:\n- comunicar o objetivo antes da aplicacao\n- explicar o que sera feito com os resultados\n- evitar linguagem punitiva\n- reforcar que o foco e melhoria organizacional\n- garantir confidencialidade e tratamento consolidado das respostas\n- divulgar prazo, canal e proximo passo\n\nErro comum:\nAbrir pesquisa sem explicar finalidade, sem garantir confianca e sem retorno posterior.",
    foundation_type: "metodologico",
    foundation_reference: "Pasini - Engajamento e comunicacao interna",
    status: "draft",
  },
  {
    domain: "organizational",
    category: "climate_research",
    title: "Pesquisa de Clima Organizacional - leitura dos resultados e priorizacao",
    summary: "Define como consolidar resultados, separar temas recorrentes e priorizar intervencoes.",
    body: "Leitura recomendada:\n- consolidar os achados por tema\n- separar pontos fortes e pontos criticos\n- identificar recorrencia por area ou lideranca\n- cruzar percepcoes com fatos organizacionais observaveis\n- evitar conclusoes precipitadas baseadas em um unico comentario\n\nPriorizacao:\n1. temas com maior recorrencia\n2. temas com maior impacto no ambiente de trabalho\n3. temas com possibilidade real de acao\n4. temas que exigem resposta imediata da gestao\n\nSaida minima:\n- lista priorizada de achados\n- justificativa da prioridade\n- proposta de encaminhamento",
    foundation_type: "metodologico",
    foundation_reference: "Pasini - Analise e leitura de clima",
    status: "draft",
  },
  {
    domain: "organizational",
    category: "climate_research",
    title: "Pesquisa de Clima Organizacional - plano de acao e devolutiva",
    summary: "Transforma o resultado da pesquisa em resposta organizacional concreta com devolutiva e acompanhamento.",
    body: "Regra de ouro:\nPesquisa sem devolutiva e sem plano de acao enfraquece a confianca da equipe.\n\nPlano minimo:\n- problema priorizado\n- acao definida\n- responsavel\n- prazo\n- indicador simples de acompanhamento\n- data da devolutiva para a equipe\n\nDevolutiva recomendada:\n1. apresentar visao consolidada\n2. mostrar o que foi ouvido\n3. dizer o que sera feito\n4. dizer o que nao sera feito agora\n5. informar quando havera nova revisao\n\nResultado esperado:\nFechar o ciclo entre escuta, resposta institucional e melhoria continua.",
    foundation_type: "metodologico",
    foundation_reference: "Pasini - Devolutiva e plano de melhoria",
    status: "draft",
  },
];

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

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export default function ImportClimaPage() {
  const router = useRouter();

  const [jwt, setJwt] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);

  const passCount = useMemo(
    () => results.filter((item) => item.status === "PASS").length,
    [results]
  );

  const failCount = useMemo(
    () => results.filter((item) => item.status === "FAIL").length,
    [results]
  );

  useEffect(() => {
    (async () => {
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
          throw new Error("Nenhum tenant disponivel para este usuario.");
        }

        setTenantId(parsedTenants[0].id);
      } catch (e: any) {
        setError(e?.message || "Falha ao preparar importacao.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleImport() {
    if (!jwt || !tenantId) {
      setError("Sessao ou tenant indisponivel.");
      return;
    }

    setRunning(true);
    setError("");
    setSuccess("");
    setResults([]);

    const importResults: ImportResult[] = [];

    for (let index = 0; index < CLIMA_SEED.length; index++) {
      const item = CLIMA_SEED[index];

      try {
        const response = await fetch("/api/knowledge-items", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + jwt,
            "x-icanhelp-tenant": tenantId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(item),
        });

        const payload = await readJsonSafe(response);

        if (!response.ok) {
          const message =
            payload?.message ||
            payload?.error ||
            "Falha ao importar item.";
          importResults.push({
            index: index + 1,
            title: item.title,
            status: "FAIL",
            status_code: response.status,
            message: String(message),
          });
        } else {
          importResults.push({
            index: index + 1,
            title: item.title,
            status: "PASS",
            status_code: response.status,
            message: "Importado com sucesso.",
          });
        }
      } catch (e: any) {
        importResults.push({
          index: index + 1,
          title: item.title,
          status: "FAIL",
          status_code: null,
          message: e?.message || "Erro inesperado.",
        });
      }

      setResults([...importResults]);
    }

    const hasFail = importResults.some((item) => item.status === "FAIL");
    if (hasFail) {
      setError("Importacao concluida com falhas. Veja a grade de resultados.");
    } else {
      setSuccess("Seed pack de clima organizacional importado com sucesso.");
    }

    setRunning(false);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Importar seed - clima organizacional</h1>
          <p className="mt-2 text-sm text-gray-300">
            Esta pagina importa os 5 knowledge-items de pesquisa de clima usando a sessao ativa do navegador.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Tenant alvo
              </label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleImport}
                disabled={loading || running || !tenantId}
                className="w-full rounded-md bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? "Importando..." : "Importar 5 itens de clima"}
              </button>
            </div>
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

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Itens previstos</div>
            <div className="mt-2 text-2xl font-bold">{CLIMA_SEED.length}</div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Pass</div>
            <div className="mt-2 text-2xl font-bold text-green-300">{passCount}</div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Fail</div>
            <div className="mt-2 text-2xl font-bold text-red-300">{failCount}</div>
          </div>
        </div>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-xl font-semibold">Resultados</h2>

          {results.length === 0 ? (
            <div className="rounded-md border border-gray-800 bg-gray-950 px-4 py-4 text-sm text-gray-400">
              Nenhuma importacao executada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((item) => (
                <article
                  key={item.index}
                  className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200">
                      item {item.index}
                    </span>
                    <span
                      className={
                        item.status === "PASS"
                          ? "rounded bg-green-950 px-2 py-1 text-xs text-green-200"
                          : "rounded bg-red-950 px-2 py-1 text-xs text-red-200"
                      }
                    >
                      {item.status}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">
                      status_code: {item.status_code ?? "-"}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-300">{item.message}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
