"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!data.session) {
          setError("Sessao de recuperacao ausente. Refaça o processo de redefinicao.");
        }
      } catch (err: any) {
        setError(err?.message || "Falha ao validar a sessao de recuperacao.");
      } finally {
        setLoadingSession(false);
      }
    })();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A confirmacao da senha nao confere.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      setSuccess("Senha atualizada com sucesso. Redirecionando...");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Falha ao atualizar a senha.");
    } finally {
      setSaving(false);
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
            Definir nova senha
          </h1>

          <p className="mt-3 text-sm leading-7 text-[#5B6B79]">
            Use esta etapa para concluir a recuperacao de acesso com uma senha estavel para uso diario.
          </p>

          {loadingSession ? (
            <div className="mt-6 rounded-2xl border border-[#D9E0E7] bg-[#FAFBFC] px-4 py-4 text-sm leading-7 text-[#5B6B79]">
              Validando sessao de recuperacao...
            </div>
          ) : null}

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
                Nova senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo de 8 caracteres"
                className="w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#22313F]">
                Confirmar nova senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="w-full rounded-xl border border-[#D9E0E7] bg-white px-4 py-3 text-sm text-[#22313F] outline-none transition placeholder:text-[#7A8A98] focus:border-[#5E7A96]"
              />
            </div>

            <button
              type="submit"
              disabled={saving || loadingSession}
              className="w-full rounded-xl bg-[#5E7A96] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#516C86] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
