"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Mode = "password" | "magic";

const DEFAULT_NEXT = "/dashboard/nr1/workspace";

function sanitizeNextPath(candidate: string | null) {
  if (!candidate) return DEFAULT_NEXT;
  if (!candidate.startsWith("/")) return DEFAULT_NEXT;
  if (candidate.startsWith("//")) return DEFAULT_NEXT;
  return candidate;
}

async function waitForStableSession() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase.auth.getSession();
    if (result.data.session) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("password");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [nextPath, setNextPath] = useState(DEFAULT_NEXT);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setNextPath(sanitizeNextPath(params.get("next")));
  }, []);

  const nextLabel = useMemo(() => {
    if (nextPath.startsWith("/dashboard/nr1")) return "Continuar para a jornada NR-1";
    if (nextPath === "/dashboard") return "Continuar para o painel";
    return "Continuar para a proxima etapa";
  }, [nextPath]);

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoadingPassword(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      await waitForStableSession();
      window.location.assign(nextPath);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Falha ao entrar. Tente novamente.";
      setError(text);
    } finally {
      setLoadingPassword(false);
    }
  }

  async function handleMagicLink() {
    setError("");
    setMessage("");
    setLoadingMagic(true);

    try {
      if (!email.trim()) {
        throw new Error("Informe seu email antes de usar o link por email.");
      }

      const redirectTo = typeof window !== "undefined"
        ? window.location.origin + "/auth/callback?next=" + encodeURIComponent(nextPath)
        : undefined;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setMessage("Link enviado. Confira seu email para continuar.");
      setMode("magic");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Falha ao enviar o link por email.";
      setError(text);
    } finally {
      setLoadingMagic(false);
    }
  }
return (
    <main className="min-h-screen bg-[#f4efe7] text-slate-950">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10">
        <div className="flex flex-col justify-center">
          <header className="mb-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10243e] text-lg font-bold text-white">
                i!
              </div>
              <div>
                <p className="text-xl font-semibold leading-none text-[#10243e]">icanHelp</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-[#af8f45]">
                  NR-1 | GRO/PGR
                </p>
              </div>
            </div>

            <a
              href="#login-card"
              className="hidden rounded-full border border-[#10243e]/15 bg-white/70 px-5 py-2 text-sm font-semibold text-[#10243e] shadow-sm transition hover:bg-white md:inline-flex"
            >
              Entrar
            </a>
          </header>

          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-[#af8f45]">
              Adequacao NR-1 com jornada guiada
            </p>

            <h1 className="text-4xl font-semibold leading-tight text-[#10243e] md:text-6xl">
              A jornada NR-1 da sua empresa, guiada do diagnostico ao PGR.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              O icanHelp organiza empresa, unidades, setores, atividades, riscos,
              plano de acao e evidencias em uma experiencia simples para RH,
              gestao e parceiros SST.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#login-card"
                className="inline-flex items-center justify-center rounded-2xl bg-[#10243e] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#10243e]/15 transition hover:bg-[#18365d]"
              >
                Entrar na plataforma
              </a>

              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center rounded-2xl border border-[#10243e]/15 bg-white/70 px-6 py-3 text-sm font-semibold text-[#10243e] shadow-sm transition hover:bg-white"
              >
                Entender a jornada
              </a>
            </div>
          </div>

          <div id="como-funciona" className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10243e]">1. Prepare a base</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cadastre empresa, unidades, setores e atividades.
              </p>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10243e]">2. Diagnostico guiado</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Responda perguntas simples sobre o trabalho real.
              </p>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#10243e]">3. PGR rastreavel</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Conecte riscos, acoes e evidencias em uma unica jornada.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-[#dcc27e]/40 bg-white/60 p-5 text-sm leading-6 text-slate-700 shadow-sm">
            O sistema orienta a jornada, organiza informacoes e apoia a
            rastreabilidade. A validacao tecnica especializada continua indicada
            quando o cenario exigir.
          </div>
        </div>

        <aside
          id="login-card"
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-[#10243e]/10 md:p-8"
        >
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#af8f45]">
              Acesso seguro
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#10243e]">
              Entrar no icanHelp
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Acesse para continuar a adequacao NR-1 da empresa.
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-[#10243e]">
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
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#10243e] focus:ring-4 focus:ring-[#10243e]/10"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-[#10243e]">
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
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#10243e] focus:ring-4 focus:ring-[#10243e]/10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#10243e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18365d]"
            >
              Entrar com senha
            </button>
          </form>

          <button
            type="button"
            onClick={handleMagicLink}
            className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#10243e] transition hover:bg-slate-50"
          >
            Enviar link por e-mail
          </button>

          <div className="mt-6 rounded-2xl bg-[#f4efe7] p-4 text-xs leading-5 text-slate-600">
            Ao entrar, voce continua a jornada da empresa no ponto correto da
            plataforma.
          </div>
        </aside>
      </section>
    </main>
  )
}

