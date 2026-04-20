"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function getErrorLabel(value: string | null) {
  switch (value) {
    case "callback_error":
      return "O callback retornou um erro de autenticacao.";
    case "callback_missing":
      return "O callback nao trouxe os dados esperados de autenticacao.";
    case "callback_fail":
      return "Falha ao finalizar a autenticacao.";
    default:
      return "";
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const callbackError = useMemo(() => {
    return getErrorLabel(searchParams.get("err"));
  }, [searchParams]);

  async function handlePasswordLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoadingPassword(true);
    setError("");
    setSuccess("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.replace(redirectTo);
    } catch (err: any) {
      setError(err?.message || "Falha ao entrar com email e senha.");
    } finally {
      setLoadingPassword(false);
    }
  }

  async function handleMagicLink() {
    setLoadingMagic(true);
    setError("");
    setSuccess("");

    try {
      const redirectTo = window.location.origin + "/auth/callback";

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setSuccess("Link de acesso enviado. Use esta opcao apenas como alternativa.");
    } catch (err: any) {
      setError(err?.message || "Falha ao enviar o link de acesso.");
    } finally {
      setLoadingMagic(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#22313F]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-[#D9E0E7] bg-white p-8 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              icanHelp
            </div>

            <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#22313F]">
              Acesso estavel para uso diario.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5B6B79]">
              O acesso principal agora prioriza email e senha, com recuperacao de senha
              e sessao mais apropriada para rotina de trabalho. O link por email fica
              como alternativa, nao como caminho principal.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[#5E7A96]">
                  Principal
                </div>
                <div className="mt-2 text-sm leading-6 text-[#22313F]">
                  Entrar com email e senha para uso continuo.
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[#5E7A96]">
                  Recuperacao
                </div>
                <div className="mt-2 text-sm leading-6 text-[#22313F]">
                  Fluxo proprio para redefinir a senha com seguranca.
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[#5E7A96]">
                  Alternativa
                </div>
                <div className="mt-2 text-sm leading-6 text-[#22313F]">
                  Magic link segue disponivel somente como apoio.
                </div>
              </div>
            </div>

            <section className="mt-8 rounded-2xl border border-[#D9E0E7] bg-[#EEF4F8] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[#5E7A96]">
                O que acontece depois do login
              </div>
              <p className="mt-3 text-sm leading-7 text-[#5B6B79]">
                Depois do acesso, o usuario entra no ambiente do icanHelp e segue para
                a jornada de trabalho, sem depender do envio de um novo email a cada uso.
              </p>
            </section>
          </section>

          <section className="rounded-3xl border border-[#D9E0E7] bg-white p-8 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
              Acesso
            </div>

            <h2 className="mt-3 text-2xl font-semibold text-[#22313F]">
              Entrar no icanHelp
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#5B6B79]">
              Use email e senha como forma principal de acesso.
            </p>

            {callbackError ? (
              <div className="mt-6 rounded-2xl border border-[#E7D5B0] bg-[#FFF8E8] px-4 py-4 text-sm leading-7 text-[#7A6228]">
                {callbackError}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-2xl border border-[#E5C6C8] bg-[#FFF5F5] px-4 py-4 text-sm leading-7 text-[#7D3B43]">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-4 rounded-2xl border border-[#CFE0D4] bg-[#F4FBF6] px-4 py-4 text-sm leading-7 text-[#42634A]">
                {success}
              </div>
            ) : null}

            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#22313F]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@orgao.gov.br"
                  className="w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#22313F]">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
                />
              </div>

              <button
                type="submit"
                disabled={loadingPassword}
                className="w-full rounded-xl bg-[#5E7A96] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPassword ? "Entrando..." : "Entrar com senha"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between gap-4 text-sm">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-[#5E7A96] underline underline-offset-4"
              >
                Esqueci minha senha
              </Link>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loadingMagic || !email.trim()}
                className="font-medium text-[#5E7A96] underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMagic ? "Enviando link..." : "Usar link por email"}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
              O link por email continua disponivel, mas o acesso diario deve usar senha.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Carregando login...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

