import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BUILD = "20260201-113056";

function json(status: number, payload: any) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "x-icanhelp-build": BUILD,
      "cache-control": "no-store",
    },
  });
}

function extractBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  // Aceita: "Bearer <token>"
  const m = h.match(/^Bearer\s+(.+)\s*$/i);
  return m ? m[1] : null;
}

function looksLikeRlsOrPermError(msg: string) {
  const s = (msg || "").toLowerCase();
  return (
    s.includes("row-level security") ||
    s.includes("rls") ||
    s.includes("permission denied") ||
    s.includes("not allowed") ||
    s.includes("insufficient privilege")
  );
}

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return json(500, {
        error: "server_misconfigured",
        message: "Variáveis do Supabase não estão configuradas no ambiente.",
      });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return json(401, {
        error: "missing_bearer",
        message: "Envie Authorization: Bearer <JWT>.",
      });
    }

    // Importante: sempre validar o usuário via supabase.auth.getUser()
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: Bearer \ } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, {
        error: "unauthorized",
        message: "JWT inválido ou expirado.",
        detail: userErr?.message || null,
      });
    }

    // Consulta real confiando exclusivamente em RLS
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      const msg = error.message || "";
      // Muitos cenários de RLS/perm aparecem como "permission denied" / RLS
      if (error.code === "42501" || looksLikeRlsOrPermError(msg)) {
        return json(403, {
          error: "forbidden",
          message: "Acesso negado pela política de segurança (RLS).",
          detail: msg,
          code: error.code || null,
        });
      }

      return json(500, {
        error: "db_error",
        message: "Falha ao consultar tickets.",
        detail: msg,
        code: error.code || null,
      });
    }

    return json(200, { items: data ?? [] });
  } catch (e: any) {
    return json(500, {
      error: "internal_error",
      message: "Erro interno inesperado.",
      detail: e?.message || String(e),
    });
  }
}
