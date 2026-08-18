"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const redirectTo = window.location.origin + "/auth/callback?type=recovery";

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setSuccess("Email de recuperacao enviado. Abra o link no mesmo navegador.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao enviar o email de recuperacao.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#22313F]">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10">
        <section className="w-full rounded-3xl border border-[#D9E0E7] bg-white p-8 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5E7A96]">
            icanHelp
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#22313F]">
            Recuperar acesso
          </h1>

          <p className="mt-3 text-sm leading-7 text-[#5B6B79]">
            Informe seu email para receber o link de redefinicao de senha.
          </p>

          {error ? (
            <div className="mt-6 rounded-2xl border border-[#E5C6C8] bg-[#FFF5F5] px-4 py-4 text-sm leading-7 text-[#7D3B43]">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-2xl border border-[#CFE0D4] bg-[#F4FBF6] px-4 py-4 text-sm leading-7 text-[#42634A]">
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
              {sending ? "Enviando..." : "Enviar email de recuperacao"}
            </button>
          </form>

          <div className="mt-6 text-sm">
            <Link
              href="/login"
              className="font-medium text-[#5E7A96] underline underline-offset-4"
            >
              Voltar para o login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
