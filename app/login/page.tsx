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
    <main className="min-h-screen bg-[#f4efe7] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-10">
        <section className="flex flex-col justify-center">
          <div className="mb-8 inline-flex w-fit items-center gap-3 rounded-full border border-[#dcc27e]/40 bg-white/70 px-4 py-2 text-sm font-medium text-[#10243e] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#dcc27e]" />
            icanHelp NR-1
          </div>

          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-[#af8f45]">
              GRO/PGR guiado
            </p>

            <h1 className="text-4xl font-semibold leading-tight text-[#10243e] md:text-6xl">
              Login que abre a jornada NR-1 sem transformar seguranca em planilha.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Organize empresa, unidades, setores, atividades, diagnostico, riscos,
              plano de acao, evidencias e PGR em uma experiencia clara para quem
              precisa fazer a adequacao acontecer.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10243e]">Preparar a base</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Comece pela empresa, estabelecimentos e responsaveis.
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10243e]">Mapear o trabalho</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Setores e atividades viram uma trilha simples de diagnostico.
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10243e]">Consolidar o PGR</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Riscos, acoes e evidencias ficam conectados em uma so jornada.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-[#10243e]">
            <span className="rounded-full bg-white/70 px-4 py-2 shadow-sm">Jornada guiada</span>
            <span className="rounded-full bg-white/70 px-4 py-2 shadow-sm">Workspace admin</span>
            <span className="rounded-full bg-white/70 px-4 py-2 shadow-sm">Multiempresa</span>
            <span className="rounded-full bg-white/70 px-4 py-2 shadow-sm">PGR com evidencias</span>
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/15 bg-[#10243e] text-white shadow-2xl">
            <div className="border-b border-white/10 px-7 py-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#dcc27e]">
                Acesso seguro
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                Entre para continuar o GRO/PGR
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Use seu e-mail e senha. O link por e-mail continua disponivel como apoio.
              </p>
            </div>

            <div className="px-7 py-6">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-white/85">
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
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="text-sm font-medium text-white/85">
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
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-2xl bg-[#dcc27e] px-5 py-3 text-sm font-semibold text-[#10243e] transition hover:bg-[#ead491] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Entrar com senha
                </button>
              </form>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleClearSession}
                  className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Limpar sessao
                </button>

                <button
                  type="button"
                  onClick={handleEmailLink}
                  disabled={!canSubmit}
                  className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Enviar link por e-mail
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#dcc27e]">
                  Destino depois do login
                </p>
                <p className="mt-2 break-all text-sm text-white/75">{returnTo}</p>
              </div>

              {message ? (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                    status === "error"
                      ? "border-red-300/40 bg-red-500/10 text-red-100"
                      : "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              {sessionStatus ? (
                <p className="mt-4 text-xs leading-5 text-white/55">
                  Status tecnico da sessao: {sessionStatus}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
