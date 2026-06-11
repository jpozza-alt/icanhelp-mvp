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
    <main className="min-h-dvh overflow-x-hidden bg-[#f4efe7] text-[#10243e]">
      <section className="mx-auto grid min-h-dvh w-full max-w-7xl gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_0.78fr] lg:items-center lg:px-10">
        <div className="flex min-w-0 flex-col justify-center">
          <header className="mb-7">
            <p className="text-3xl font-semibold tracking-[-0.055em] text-[#10243e] sm:text-[2.35rem]">
              icanHelp
            </p>
            <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#af8f45]">
              Módulo NR-1 | GRO/PGR
            </p>
          </header>

          <div className="mb-5 inline-flex w-fit max-w-full items-center gap-3 rounded-full border border-[#dcc27e]/45 bg-white/70 px-4 py-2 text-xs font-semibold text-[#10243e] shadow-sm">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#dcc27e]" />
            <span className="leading-5">SaaS para organizar a jornada de adequação NR-1</span>
          </div>

          <h1 className="max-w-3xl text-[2.25rem] font-medium leading-[1.05] tracking-[-0.045em] text-[#10243e] sm:text-[3rem] lg:text-[3.35rem]">
            Adequação NR-1 guiada, rastreável e simples de executar.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[#243b55] sm:text-[1.05rem]">
            Organize a base da empresa, mapeie o trabalho real, registre riscos e
            acompanhe evidências em uma jornada clara para RH, gestão e parceiros
            SST.
          </p>

          <div className="mt-7 max-w-3xl rounded-3xl border border-[#d9c9b8] bg-white/68 p-4 shadow-sm">
            <div className="grid gap-3 text-sm text-[#10243e] sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xs font-black tracking-[0.18em] text-[#af8f45]">01</span>
                <div>
                  <p className="font-bold">Base da empresa</p>
                  <p className="mt-1 text-xs leading-5 text-[#304761]">Empresa, unidades e setores.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-[#d9c9b8]/70 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <span className="mt-0.5 text-xs font-black tracking-[0.18em] text-[#af8f45]">02</span>
                <div>
                  <p className="font-bold">Diagnóstico guiado</p>
                  <p className="mt-1 text-xs leading-5 text-[#304761]">Perguntas sobre o trabalho real.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-[#d9c9b8]/70 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <span className="mt-0.5 text-xs font-black tracking-[0.18em] text-[#af8f45]">03</span>
                <div>
                  <p className="font-bold">PGR com evidências</p>
                  <p className="mt-1 text-xs leading-5 text-[#304761]">Riscos, ações e registros conectados.</p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-[#52677e]">
            O icanHelp apoia a organização da jornada. A validação técnica
            especializada continua indicada quando o cenário exigir.
          </p>
        </div>

        <aside
          data-session-status={sessionStatus ?? ""}
          className="mx-auto w-full max-w-md rounded-[1.4rem] bg-[#10243e] text-white shadow-xl shadow-[#10243e]/18 lg:mx-0 lg:justify-self-end"
        >
          <div className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#dcc27e]">
              Acesso seguro
            </p>

            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
              Acesso ao icanHelp
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/74">
              Continue a jornada NR-1 da empresa.
            </p>
          </div>

          <div className="border-t border-white/10 p-6">
            <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-[#10243e] outline-none transition focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-[#10243e] outline-none transition focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-2xl bg-[#dcc27e] px-5 py-3 text-sm font-bold text-[#10243e] transition hover:bg-[#ead28f] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Entrar
              </button>
            </form>

            <button
              type="button"
              onClick={handleEmailLink}
              disabled={!canSubmit}
              className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Receber link por e-mail
            </button>

            {message ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  status === "error"
                    ? "border-red-300/40 bg-red-500/10 text-red-100"
                    : "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {message}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleClearSession}
              className="mt-4 text-left text-xs font-semibold text-white/48 underline-offset-4 transition hover:text-white hover:underline"
            >
              Problemas para entrar? Limpar acesso atual.
            </button>
          </div>
        </aside>
      </section>
    </main>
  )}
