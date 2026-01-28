"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getHashParams() {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get("access_token") || undefined,
    refresh_token: params.get("refresh_token") || undefined,
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        // 1) Fluxo hash (#access_token)
        const { access_token, refresh_token } = getHashParams();
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          router.replace("/dashboard");
          return;
        }

        // 2) Fluxo com ?code= (alguns provedores)
        const code = search.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          router.replace("/dashboard");
          return;
        }

        // Sem nada válido -> volta ao login
        router.replace("/login?err=callback_missing");
      } catch {
        router.replace("/login?err=callback_fail");
      }
    })();
  }, [router, search]);

  return (
    <main className="min-h-screen flex items-center justify-center text-gray-100">
      Autenticando...
    </main>
  );
}

