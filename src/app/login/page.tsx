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

      setSuccess("Link de acesso enviado. Abra o email e clique no link imediatamente.");
    } catch (err: any) {
      setError(err?.message || "Falha ao enviar o link de acesso.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-6 py-10 text-[#f5f7fa]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-[#22324c] bg-[#0d1a2e] p-8 shadow-2xl shadow-black/30">
            <div className="mb-8">
              <div className="text-xs font-semibold uppercase tracking-[0.35em] text-[#c9a45c]">
                icanHelp
              </div>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-white">
                Atendimento institucional com mais clareza, trilha e confianca.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#d8e0ea]">
                Entre com magic link para acessar o painel. O foco aqui e velocidade,
                consistencia visual e leitura confortavel em tela escura.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#22324c] bg-[#091426] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#c9a45c]">
                  Seguro
                </div>
                <div className="mt-2 text-sm text-[#d8e0ea]">
                  Fluxo tenant-scoped com trilha e consistencia.
                </div>
              </div>

              <div className="rounded-2xl border border-[#22324c] bg-[#091426] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#c9a45c]">
                  Escuro
                </div>
                <div className="mt-2 text-sm text-[#d8e0ea]">
                  Contraste forte com menos cansaco visual.
                </div>
              </div>

              <div className="rounded-2xl border border-[#22324c] bg-[#091426] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#c9a45c]">
                  Auditavel
                </div>
                <div className="mt-2 text-sm text-[#d8e0ea]">
                  Fundamento, versao e trilha em primeiro plano.
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#2a3d5e] bg-[#10203a] p-8 shadow-2xl shadow-black/30">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.35em] text-[#c9a45c]">
                Acesso
              </div>
              <h2 className="mt-3 text-2xl font-bold text-white">
                Entrar no icanHelp
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#d8e0ea]">
                Informe seu email e receba um link de acesso para este navegador.
              </p>
            </div>

            {callbackError && (
              <div className="mb-4 rounded-xl border border-[#6b3f1f] bg-[#3c2412] px-4 py-3 text-sm text-[#f2d6a2]">
                {callbackError}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-[#6b2830] bg-[#3a151a] px-4 py-3 text-sm text-[#f3c4cb]">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-xl border border-[#3f5f2c] bg-[#1f3216] px-4 py-3 text-sm text-[#d0f0bf]">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#f5f7fa]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@orgao.gov.br"
                  className="w-full rounded-xl border border-[#314667] bg-[#091426] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8ea0bb] focus:border-[#c9a45c]"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl border border-[#c9a45c] bg-[#c9a45c] px-4 py-3 text-sm font-semibold text-[#07111f] hover:bg-[#d9b97e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Enviando..." : "Enviar link de acesso"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-[#22324c] bg-[#091426] p-4 text-sm leading-6 text-[#c7d2df]">
              Dica: abra o email e clique no link logo depois do envio, no mesmo navegador.
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