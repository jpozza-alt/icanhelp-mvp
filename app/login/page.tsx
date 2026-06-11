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
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10">
        <div className="flex flex-col justify-center">
          <div className="mb-10 inline-flex w-fit items-center gap-3 rounded-full border border-[#dcc27e]/45 bg-white/75 px-5 py-2 text-sm font-semibold text-[#10243e] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#dcc27e]" />
            icanHelp NR-1
          </div>

          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.34em] text-[#af8f45]">
            GRO/PGR guiado
          </p>

          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-[#10243e] md:text-6xl">
            A jornada NR-1 da sua empresa, guiada do diagnostico ao PGR.
          </h1>

          <p className="mt-7 max-w-3xl text-lg leading-8 text-[#243b55]">
            O icanHelp organiza empresa, unidades, setores, atividades, riscos,
            plano de acao e evidencias em uma experiencia simples para RH,
            gestao e parceiros SST.
          </p>

          <div className="mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-[#d9c9b8] bg-white/80 p-6 shadow-sm">
              <p className="text-sm font-bold text-[#10243e]">Prepare a base</p>
              <p className="mt-3 text-sm leading-6 text-[#304761]">
                Cadastre empresa, unidades, setores e atividades.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d9c9b8] bg-white/80 p-6 shadow-sm">
              <p className="text-sm font-bold text-[#10243e]">Diagnostico guiado</p>
              <p className="mt-3 text-sm leading-6 text-[#304761]">
                Responda perguntas simples sobre o trabalho real.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d9c9b8] bg-white/80 p-6 shadow-sm">
              <p className="text-sm font-bold text-[#10243e]">PGR rastreavel</p>
              <p className="mt-3 text-sm leading-6 text-[#304761]">
                Conecte riscos, acoes e evidencias em uma unica jornada.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3 text-sm font-semibold text-[#10243e]">
            <span className="rounded-full border border-[#d9c9b8] bg-white/75 px-5 py-2 shadow-sm">Jornada guiada</span>
            <span className="rounded-full border border-[#d9c9b8] bg-white/75 px-5 py-2 shadow-sm">Workspace admin</span>
            <span className="rounded-full border border-[#d9c9b8] bg-white/75 px-5 py-2 shadow-sm">Multiempresa</span>
            <span className="rounded-full border border-[#d9c9b8] bg-white/75 px-5 py-2 shadow-sm">PGR com evidencias</span>
          </div>
        </div>

        <aside
          data-session-status={sessionStatus ?? ""}
          className="rounded-[2rem] bg-[#10243e] text-white shadow-2xl shadow-[#10243e]/25"
        >
          <div className="p-8 md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-[#dcc27e]">
              Acesso seguro
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em]">
              Entrar no icanHelp
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/78">
              Acesse para continuar a adequacao NR-1 da empresa.
            </p>
          </div>

          <div className="border-t border-white/10 p-8 md:p-10">
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-white/90">
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
                <label htmlFor="password" className="text-sm font-semibold text-white/90">
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
                className="w-full rounded-2xl bg-[#dcc27e] px-5 py-4 text-sm font-bold text-[#10243e] transition hover:bg-[#ead28f] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Entrar com senha
              </button>
            </form>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleClearSession}
                className="rounded-2xl border border-white/15 px-4 py-4 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Limpar sessao
              </button>

              <button
                type="button"
                onClick={handleEmailLink}
                disabled={!canSubmit}
                className="rounded-2xl border border-white/15 px-4 py-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
              >
                Enviar link por e-mail
              </button>
            </div>

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
              Ao entrar, voce continua a jornada da empresa no ponto correto da
              plataforma.
            </div>
          </div>
        </aside>
      </section>
    </main>
  )}
