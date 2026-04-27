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
  const [mode, setMode] = useState<LoginMode>("password");
  const [returnTo, setReturnTo] = useState("/dashboard");
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
    setReturnTo(nextPath);

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
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="bg-slate-950 p-8 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 font-bold text-slate-950">
              iC
            </div>
            <div>
              <p className="text-2xl font-bold">icanHelp</p>
              <p className="text-sm text-slate-300">Acesso da plataforma</p>
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Proxima etapa</p>
            <h2 className="mt-6 text-3xl font-bold leading-tight">Entrar novamente</h2>
            <p className="mt-6 text-sm leading-7 text-slate-300">
              Esta tela nao redireciona automaticamente. Ela exige login por senha para criar uma sessao limpa no Supabase.
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">O que este login corrige</p>
            <p className="mt-4">- evita sessao antiga</p>
            <p>- limpa sessao antes de entrar</p>
            <p>- cria token Supabase real</p>
            <p>- retorna para o workspace NR1</p>
          </div>
        </aside>

        <section className="p-8 lg:p-14">
          <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-cyan-700 p-8 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-100">Acesso autenticado</p>
            <h1 className="mt-6 text-4xl font-bold">Entrar no icanHelp</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-cyan-50">
              Use email e senha. O sistema limpa sessao anterior antes de autenticar.
            </p>
            <p className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
              Destino depois do login: {returnTo}
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={handlePasswordLogin} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Login por senha</h2>
                  <p className="mt-4 text-slate-600">
                    Entre novamente para carregar tenant, empresas, estabelecimentos e dados NR1.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">sessao limpa</span>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {sessionStatus}
              </div>

              <label className="mt-8 block text-sm font-bold">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4"
                placeholder="email"
              />

              <label className="mt-5 block text-sm font-bold">Senha</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-4"
                placeholder="senha"
              />

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-7 w-full rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white disabled:opacity-50"
              >
                Entrar com senha
              </button>

              <button
                type="button"
                onClick={() => void handleClearSession()}
                disabled={status === "loading"}
                className="mt-4 w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold text-slate-700 disabled:opacity-50"
              >
                Limpar sessao atual
              </button>

              {message ? (
                <div
                  className={
                    status === "error"
                      ? "mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                      : "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                  }
                >
                  {message}
                </div>
              ) : null}
            </form>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Alternativa de apoio</h2>
                  <p className="mt-4 text-slate-600">
                    Use link por email apenas depois que o login por senha estiver validado.
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">apoio</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMode("email_link");
                  void handleEmailLink();
                }}
                disabled={!email.trim() || status === "loading"}
                className="mt-8 w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold disabled:opacity-50"
              >
                Enviar link por email
              </button>

              <button
                type="button"
                onClick={() => setMode("password")}
                className="mt-4 w-full rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700"
              >
                Usar acesso por senha
              </button>

              <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Modo atual: {mode === "password" ? "acesso por senha" : "link por email"}.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
