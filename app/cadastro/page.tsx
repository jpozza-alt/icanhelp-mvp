"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
);

export default function CadastroPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      Boolean(email.trim()) &&
      password.length >= 8 &&
      confirmPassword === password &&
      status !== "loading"
    );
  }, [name, email, password, confirmPassword, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (name.trim().length < 2) {
      setStatus("error");
      setMessage("Informe seu nome.");
      return;
    }

    if (password.length < 8) {
      setStatus("error");
      setMessage("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("As senhas informadas não conferem.");
      return;
    }

    setStatus("loading");

    const emailRedirectTo =
      typeof window !== "undefined"
        ? window.location.origin +
          "/auth/callback?next=" +
          encodeURIComponent("/onboarding")
        : undefined;

    const result = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
        emailRedirectTo,
      },
    });

    if (result.error) {
      setStatus("error");
      setMessage(
        result.error.message || "Não foi possível criar sua conta."
      );
      return;
    }

    if (result.data.session?.access_token) {
      setStatus("done");
      setMessage("Conta criada. Preparando seu primeiro acesso...");
      router.replace("/onboarding");
      router.refresh();
      return;
    }

    setStatus("done");
    setMessage(
      "Conta criada. Se a confirmação de e-mail estiver habilitada, confirme seu endereço e depois entre com a senha cadastrada."
    );
  }

  return (
    <main className="min-h-dvh bg-[#f4efe7] px-5 py-8 text-[#10243e]">
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#af8f45]">
            icanHelp | NR-1
          </p>

          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-5xl">
            Crie sua conta para começar.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-[#52677e]">
            Primeiro criamos apenas seu acesso ao icanHelp. Sua conta não recebe
            automaticamente empresa, organização ou papel administrativo.
          </p>

          <div className="mt-6 rounded-3xl border border-[#d9c9b8] bg-white/70 p-5 text-sm leading-6 text-[#304761]">
            Depois do cadastro, você poderá criar o espaço da sua empresa ou
            acessar uma organização à qual tenha sido convidado.
          </div>
        </div>

        <aside className="rounded-[1.6rem] bg-[#10243e] p-6 text-white shadow-xl shadow-[#10243e]/15 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#dcc27e]">
            Novo acesso
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            Criar minha conta
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-semibold">
                Nome
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-[#10243e] outline-none focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
              />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-semibold">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com.br"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-[#10243e] outline-none focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-[#10243e] outline-none focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="text-sm font-semibold"
              >
                Confirmar senha
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Digite a senha novamente"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-[#10243e] outline-none focus:border-[#dcc27e] focus:ring-4 focus:ring-[#dcc27e]/20"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-2xl bg-[#e5c76f] px-5 py-3 text-sm font-extrabold text-[#10243e] transition hover:bg-[#f0d684] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          {message ? (
            <div
              className={
                "mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 " +
                (status === "error"
                  ? "border-red-300/40 bg-red-500/10 text-red-100"
                  : "border-emerald-300/40 bg-emerald-500/10 text-emerald-100")
              }
            >
              {message}
            </div>
          ) : null}

          <p className="mt-5 text-center text-sm text-white/70">
            Já possui conta?{" "}
            <Link
              href="/login"
              className="font-bold text-[#f0d684] underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </aside>
      </section>
    </main>
  );
}