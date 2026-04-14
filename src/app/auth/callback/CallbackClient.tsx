"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getHashParams() {
  if (typeof window === "undefined") {
    return {
      access_token: null as string | null,
      refresh_token: null as string | null,
      error: null as string | null,
      error_code: null as string | null,
      error_description: null as string | null,
    };
  }

  const rawHash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  const params = new URLSearchParams(rawHash);

  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    error: params.get("error"),
    error_code: params.get("error_code"),
    error_description: params.get("error_description"),
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const hashParams = getHashParams();

        if (hashParams.access_token && hashParams.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: hashParams.access_token,
            refresh_token: hashParams.refresh_token,
          });

          if (error) {
            throw error;
          }

          router.replace("/dashboard");
          return;
        }

        const code = search.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          router.replace("/dashboard");
          return;
        }

        if (hashParams.error || hashParams.error_code || hashParams.error_description) {
          router.replace("/login?err=callback_error");
          return;
        }

        router.replace("/login?err=callback_missing");
      } catch {
        router.replace("/login?err=callback_fail");
      }
    })();
  }, [router, search]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07111f] p-6 text-[#f5f7fa]">
      <div className="w-full max-w-md rounded-3xl border border-[#22324c] bg-[#0d1a2e] p-8 text-center shadow-2xl shadow-black/30">
        <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[#c9a45c]">
          icanHelp
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">Autenticando</h1>
        <p className="mt-3 text-sm leading-6 text-[#d8e0ea]">
          Aguarde enquanto finalizamos seu acesso com conforto visual em tema escuro.
        </p>
      </div>
    </main>
  );
}
