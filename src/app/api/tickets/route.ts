import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BUILD = "20260201-115027";

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
        message: "VariÃ¡veis do Supabase nÃ£o estÃ£o configuradas no ambiente.",
      });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return json(401, {
        error: "missing_bearer",
        message: "Envie Authorization: Bearer <JWT>.",
      });
    }

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: "Bearer " + token } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, {
        error: "unauthorized",
        message: "JWT invÃ¡lido ou expirado.",
        detail: userErr?.message || null,
      });
    }

    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      const msg = error.message || "";
      if (error.code === "42501" || looksLikeRlsOrPermError(msg)) {
        return json(403, {
          error: "forbidden",
          message: "Acesso negado pela polÃ­tica de seguranÃ§a (RLS).",
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