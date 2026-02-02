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
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
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

  // Diagnóstico: metadados do schema/policies (via PostgREST/RLS vai influenciar)
  // Usamos RPC SQL via `select` em `information_schema` e `pg_*` (pode ser bloqueado por RLS/permissions).
  // Se bloquear, o erro nos diz que precisamos fazer isso via service role em DEV apenas.

  const results: any = {};

  const cols = await supabase
    .from("information_schema.columns")
    .select("column_name,data_type,is_nullable,udt_name")
    .eq("table_schema", "public")
    .eq("table_name", "tickets");

  results.columns = cols;

  const rls = await supabase
    .from("pg_class")
    .select("relname,relrowsecurity,relforcerowsecurity")
    .eq("relname", "tickets");

  results.rls = rls;

  const policies = await supabase
    .from("pg_policies")
    .select("policyname,cmd,permissive,roles,qual,with_check")
    .eq("schemaname", "public")
    .eq("tablename", "tickets");

  results.policies = policies;

  return NextResponse.json({
    ok: true,
    user_id: userData.user.id,
    results,
    note:
      "Se algum desses selects retornar erro/403, isso indica falta de permissão para introspecção via anon+JWT (esperado).",
  });
}
