"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type LoginMode = "password" | "email_link";

function getSafeReturnPath(): string {
  if (typeof window === "undefined") return "/dashboard";

  const params = new URLSearchParams(window.location.search);
  const raw =
    params.get("next") ||
    params.get("redirect") ||
    params.get("returnTo") ||
    "/dashboard";

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }

  return raw;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode] = useState<LoginMode>("password");
  const [returnTo] = useState("/dashboard");
  const [sessionStatus, setSessionStatus] = useState("Verificando sessao...");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (mode === "password" && !password.trim()) return false;
    return status !== "loading";
  }, [email, password, mode, status]);

  useEffect(() => {
    const nextPath = getSafeReturnPath();

    supabase.auth.getSession().then((result) => {
      if (result.data.session?.access_token) {
        setSessionStatus("Sessao existente detectada. Para evitar tenant antigo, entre novamente com senha ou limpe a sessao.");
      } else {
        setSessionStatus("Nenhuma sessao ativa. Entre com email e senha.");
      }
    });
  }, []);

  async function handleClearSession() {
    setStatus("loading");
    setMessage("");

    const result = await supabase.auth.signOut();

    if (result.error) {
      setStatus("error");
      setMessage(result.error.message || "Nao foi possivel limpar a sessao.");
      return;
    }

    setPassword("");
    setStatus("done");
    setSessionStatus("Sessao limpa. Agora entre com email e senha.");
    setMessage("Sessao limpa. Digite email e senha para entrar novamente.");
  }

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    await supabase.auth.signOut();

    const result = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (result.error) {
      setStatus("error");
      setMessage(result.error.message || "Nao foi possivel entrar.");
      return;
    }

    setStatus("done");
    setMessage("Login realizado. Redirecionando...");
    router.replace(returnTo);
    router.refresh();
  }

  async function handleEmailLink() {
    setStatus("loading");
    setMessage("");

    const redirectTo =
      typeof window !== "undefined"
        ? window.location.origin + returnTo
        : undefined;

    const result = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (result.error) {
      setStatus("error");
      setMessage(result.error.message || "Nao foi possivel enviar o link.");
      return;
    }

    setStatus("done");
    setMessage("Link enviado para o email informado.");
  }
return (
    <main className="min-h-screen bg-[#f4efe7] text-[#10243e]">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10">
        <div className="flex flex-col justify-center">
          <header className="mb-12 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10243e] text-xl font-black text-white shadow-lg shadow-[#10243e]/18">
              i!
            </div>

            <div>
              <p className="text-2xl font-black tracking-[-0.04em] text-[#10243e]">
                icanHelp
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.28em] text-[#af8f45]">
                Módulo NR-1 | GRO/PGR
              </p>
            </div>
          </header>

          <div className="mb-6 inline-flex w-fit items-center gap-3 rounded-full border border-[#dcc27e]/45 bg-white/75 px-5 py-2 text-sm font-bold text-[#10243e] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#dcc27e]" />
            Adequação guiada para empresas, RH e parceiros SST
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.06] tracking-[-0.04em] text-[#10243e] md:text-6xl">
            Adequação NR-1 guiada pelo icanHelp.
          </h1>

          <p className="mt-7 max-w-3xl text-lg leading-8 text-[#243b55]">
            Da organização da empresa ao PGR, uma jornada simples para mapear o
            trabalho real, registrar riscos, acompanhar ações e manter evidências
            organizadas.
          </p>

          <div className="mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-[#d9c9b8] bg-white/82 p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#af8f45]">01</p>
              <p className="mt-3 text-base font-black text-[#10243e]">Base da empresa</p>
              <p className="mt-3 text-sm leading-6 text-[#304761]">
                Organize empresa, unidades, setores, funções e atividades.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d9c9b8] bg-white/82 p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#af8f45]">02</p>
              <p className="mt-3 text-base font-black text-[#10243e]">Diagnóstico guiado</p>
              <p className="mt-3 text-sm leading-6 text-[#304761]">
                Responda perguntas simples sobre o trabalho como ele acontece.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d9c9b8] bg-white/82 p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#af8f45]">03</p>
              <p className="mt-3 text-base font-black text-[#10243e]">PGR e evidências</p>
              <p className="mt-3 text-sm leading-6 text-[#304761]">
                Conecte riscos, plano de ação e registros em uma jornada rastreável.
              </p>
            </div>
          </div>

          <div className="mt-8 max-w-4xl rounded-3xl border border-[#dcc27e]/45 bg-white/68 p-5 text-sm leading-6 text-[#304761] shadow-sm">
            O icanHelp apoia a organização e a rastreabilidade da jornada. A
            validação técnica especializada continua indicada quando o cenário
            exigir.
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-[#10243e]">
            <span className="rounded-full border border-[#d9c9b8] bg-white/75 px-5 py-2 shadow-sm">Jornada guiada</span>
            <span className="rounded-full border border-[#d9c9b8] bg-white/75 px-5 py-2 shadow-sm">Multiempresa</span>
            <span className="rounded-full border border-[#d9c9b8] bg-white/75 px-5 py-2 shadow-sm">Evidências organizadas</span>
            <span className="rounded-full border border-[#d9c9b8] bg-white/75 px-5 py-2 shadow-sm">Apoio para SST</span>
          </div>
        </div>

        <aside
          data-session-status={sessionStatus ?? ""}
          className="rounded-[2rem] bg-[#10243e] text-white shadow-2xl shadow-[#10243e]/25"
        >
          <div className="p-8 md:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#dcc27e]">
              Acesso seguro
            </p>

            <h2 className="mt-5 text-3xl font-black tracking-[-0.035em]">
              Entrar no icanHelp
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/78">
              Continue a jornada NR-1 da empresa no ponto em que parou.
            </p>
          </div>

          <div className="border-t border-white/10 p-8 md:p-10">
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="text-sm font-bold text-white/90">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@empresa.com.br"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-4 text-sm text-[#10243e] outline-none transition focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-bold text-white/90">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-4 text-sm text-[#10243e] outline-none transition focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-2xl bg-[#dcc27e] px-5 py-4 text-sm font-black text-[#10243e] transition hover:bg-[#ead28f] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Entrar com senha
              </button>
            </form>

            <button
              type="button"
              onClick={handleEmailLink}
              disabled={!canSubmit}
              className="mt-4 w-full rounded-2xl border border-white/15 px-4 py-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Enviar link por e-mail
            </button>

            {message ? (
              <div
                className={`mt-6 rounded-2xl border px-4 py-4 text-sm leading-6 ${
                  status === "error"
                    ? "border-red-300/40 bg-red-500/10 text-red-100"
                    : "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {message}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl bg-white/10 p-5 text-sm leading-6 text-white/78">
              Seu acesso leva ao ambiente de trabalho da empresa, com a jornada
              NR-1 organizada em etapas.
            </div>

            <button
              type="button"
              onClick={handleClearSession}
              className="mt-4 text-left text-xs font-semibold text-white/55 underline-offset-4 transition hover:text-white hover:underline"
            >
              Problemas para entrar? Limpar acesso atual.
            </button>
          </div>
        </aside>
      </section>
    </main>
  )}
