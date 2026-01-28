import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cria um client Supabase para uso no SERVER (App Router).
 * - Compatível com Route Handlers, Server Actions e Server Components
 * - Usa cookies corretamente (sem headers inválidos)
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
