"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Mode = "password" | "magic";

const DEFAULT_NEXT = "/dashboard";

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
    <main className="min-h-screen bg-[#F4F7FB] text-[#132238]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="bg-gradient-to-b from-[#0F2337] to-[#142C43] px-6 py-8 text-white xl:sticky xl:top-0 xl:min-h-screen">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-gradient-to-br from-[#13A3A8] to-[#86F0D3] text-sm font-extrabold text-[#08323B] shadow-[0_10px_18px_rgba(19,163,168,0.35)]">
              iC
            </div>
            <div>
              <div className="text-[28px] font-semibold leading-none">icanHelp</div>
              <div className="mt-2 text-sm text-white/70">Acesso da plataforma</div>
            </div>
          </div>

          <div className="mt-8 rounded-[22px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">proxima etapa</div>
            <div className="mt-3 text-[28px] font-extrabold">{nextLabel}</div>
            <p className="mt-3 text-sm leading-7 text-white/78">
              O acesso autenticado agora conversa com a nova vitrine do modulo e preserva o caminho de retorno.
            </p>
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">o que este login entrega</div>
            <div className="mt-4 grid gap-3 text-sm text-[#DCE8F3]">
              <div>- entrada com email e senha</div>
              <div>- link por email como apoio</div>
              <div>- retorno preservado para a rota pedida</div>
              <div>- visual alinhado com a vitrine NR-1</div>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">atalhos</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/nr1"
                className="rounded-[14px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Voltar para a vitrine
              </Link>
              <Link
                href="/dashboard/nr1/demonstracao"
                className="rounded-[14px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Ver demonstracao
              </Link>
            </div>
          </div>
        </aside>

        <section className="min-w-0 px-6 py-8 xl:px-8">
          <div className="mx-auto max-w-[980px]">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#0F2337_0%,#13495C_60%,#178A8F_100%)] p-7 text-white shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
              <div className="text-[12px] uppercase tracking-[0.08em] text-white/70">acesso autenticado</div>
              <h1 className="mt-4 text-[38px] font-semibold leading-tight">Entrar no icanHelp</h1>
              <p className="mt-3 max-w-[760px] text-base leading-7 text-white/85">
                A vitrine publica ficou separada da execucao real. Agora o login usa a mesma linguagem visual e preserva o retorno para a etapa solicitada.
              </p>
              <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
                Destino depois do login: {nextPath}
              </div>
            </div>

            <div className="mt-[18px] grid gap-[18px] lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">Forma principal de acesso</h2>
                  <span className="rounded-full border border-[#C8F0DA] bg-[#EBFBF3] px-[10px] py-[7px] text-xs font-bold text-[#20865A]">
                    senha
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-[#60718A]">
                  Entre com email e senha para continuar o trabalho sem depender de um novo email a cada uso.
                </p>

                <form className="mt-6 grid gap-4" onSubmit={handlePasswordLogin}>
                  <label className="grid gap-2 text-sm font-semibold text-[#132238]">
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="voce@orgao.gov.br"
                      className="h-14 rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 text-base outline-none transition focus:border-[#13A3A8] focus:bg-white"
                      autoComplete="email"
                      required
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-[#132238]">
                    Senha
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Sua senha"
                      className="h-14 rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-4 text-base outline-none transition focus:border-[#13A3A8] focus:bg-white"
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <Link href="/auth/forgot-password" className="font-semibold text-[#0F7B83] underline-offset-4 hover:underline">
                      Esqueci minha senha
                    </Link>

                    <button
                      type="button"
                      onClick={() => setMode("magic")}
                      className="font-semibold text-[#60718A] underline-offset-4 hover:underline"
                    >
                      Usar link por email
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingPassword}
                    className="mt-1 h-14 rounded-[16px] bg-[linear-gradient(135deg,#0F7B83,#13A3A8)] px-5 text-base font-semibold text-white shadow-[0_10px_20px_rgba(19,163,168,0.24)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loadingPassword ? "Entrando..." : "Entrar com senha"}
                  </button>
                </form>
              </div>

              <div className="grid gap-[18px]">
                <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold">Alternativa de apoio</h2>
                    <span className="rounded-full border border-[#FFE3AA] bg-[#FFF8EA] px-[10px] py-[7px] text-xs font-bold text-[#C88A16]">
                      link por email
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-[#60718A]">
                    O link por email continua disponivel como apoio. Use essa opcao se quiser receber um acesso rapido na caixa de entrada.
                  </p>

                  <button
                    type="button"
                    onClick={handleMagicLink}
                    disabled={loadingMagic}
                    className="mt-6 h-14 w-full rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] px-5 text-base font-semibold text-[#132238] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loadingMagic ? "Enviando link..." : "Enviar link por email"}
                  </button>

                  <div className="mt-4 rounded-[16px] border border-[#DBE5F0] bg-[#F8FBFF] p-4 text-sm leading-7 text-[#60718A]">
                    {mode === "magic"
                      ? "Modo atual: link por email habilitado como apoio."
                      : "Modo atual: acesso principal por senha."}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#DBE5F0] bg-white p-6 shadow-[0_10px_30px_rgba(18,40,70,0.08)]">
                  <h2 className="text-2xl font-semibold">Retorno preservado</h2>
                  <p className="mt-4 text-sm leading-7 text-[#60718A]">
                    Depois do login, o sistema tenta devolver voce para a rota pedida antes da autenticacao.
                  </p>
                  <div className="mt-4 rounded-[16px] border border-[#C7EEEE] bg-[#E7F7F7] p-4 text-sm leading-7 text-[#0F7B83]">
                    Rota de retorno atual: <strong>{nextPath}</strong>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-[20px] border border-[#F2C5C5] bg-[#FFF4F4] p-5 text-sm leading-7 text-[#9C2F2F] shadow-[0_10px_30px_rgba(18,40,70,0.04)]">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-[20px] border border-[#C8F0DA] bg-[#EBFBF3] p-5 text-sm leading-7 text-[#20865A] shadow-[0_10px_30px_rgba(18,40,70,0.04)]">
                    {message}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
