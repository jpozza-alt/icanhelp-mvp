import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function unauthorized(msg: string, detail?: string) {
  return NextResponse.json(
    { error: "unauthorized", message: msg, detail },
    { status: 401 }
  );
}

function getSupabase(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("missing_bearer");
  const token = authHeader.replace("Bearer ", "").trim();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

export async function GET(req: NextRequest) {
  let supabase;
  try {
    supabase = getSupabase(req);
  } catch {
    return unauthorized("Envie Authorization: Bearer <JWT>.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return unauthorized("JWT inválido ou expirado.", userError?.message);
  }

  const { data, error } = await supabase.rpc("debug_tickets_schema");

  if (error) {
    // Se isso falhar, é permissão de execute da função (ou função não existe).
    return NextResponse.json(
      {
        ok: false,
        error: "rpc_failed",
        message: "Falha ao executar debug_tickets_schema()",
        detail: error.message,
        hint: error.hint ?? null,
        code: error.code ?? null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    user_id: userData.user.id,
    schema: data,
  });
}
