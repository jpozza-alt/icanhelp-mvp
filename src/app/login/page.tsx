"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const callbackError = useMemo(() => {
    return getErrorLabel(searchParams.get("err"));
  }, [searchParams]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSending(true);
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

      setSuccess("Link de acesso enviado. Abra o email e clique no link neste mesmo navegador.");
    } catch (err: any) {
      setError(err?.message || "Falha ao enviar o link de acesso.");
    } finally {
      setSending(false);
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
              Entrada simples, clara e institucional.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5B6B79]">
              Esta tela segue a mesma linguagem visual do modulo NR1. O objetivo e
              deixar a entrada no sistema mais coerente com a jornada guiada: menos
              aparencia de sistema frio, mais clareza sobre o proximo passo.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[#5E7A96]">
                  Clareza
                </div>
                <div className="mt-2 text-sm leading-6 text-[#22313F]">
                  A pessoa entende rapido o que fazer para entrar.
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[#5E7A96]">
                  Seguranca
                </div>
                <div className="mt-2 text-sm leading-6 text-[#22313F]">
                  O acesso segue por link enviado ao email informado.
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[#5E7A96]">
                  Continuidade
                </div>
                <div className="mt-2 text-sm leading-6 text-[#22313F]">
                  A experiencia visual agora conversa com o restante do modulo.
                </div>
              </div>
            </div>

            <section className="mt-8 rounded-2xl border border-[#D9E0E7] bg-[#EEF4F8] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[#5E7A96]">
                O que acontece depois do login
              </div>
              <p className="mt-3 text-sm leading-7 text-[#5B6B79]">
                Depois do acesso, o usuario entra no ambiente do icanHelp e pode seguir
                para a jornada NR1, incluindo o diagnostico inicial que agora salva draft
                real no backend.
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
              Informe seu email para receber um link de acesso seguro.
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

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-[#5E7A96] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Enviando..." : "Enviar link de acesso"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-[#E6ECF1] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#5B6B79]">
              Dica: abra o email e clique no link no mesmo navegador em que voce pediu o acesso.
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