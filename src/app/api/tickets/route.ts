import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function unauthorized(msg: string, detail?: string) {
  return NextResponse.json(
    { error: "unauthorized", message: msg, detail },
    { status: 401 }
  );
}

function forbidden(msg: string) {
  return NextResponse.json(
    { error: "forbidden", message: msg },
    { status: 403 }
  );
}

function getSupabaseFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("missing_bearer");
  }

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

/* =========================
   GET /api/tickets
========================= */
export async function GET(req: NextRequest) {
  let supabase;
  try {
    supabase = getSupabaseFromRequest(req);
  } catch {
    return unauthorized("Envie Authorization: Bearer <JWT>.");
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return unauthorized("JWT inválido ou expirado.", userError?.message);
  }

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return forbidden("RLS bloqueou a leitura.");
  }

  return NextResponse.json({ items: data ?? [] });
}

/* =========================
   POST /api/tickets
========================= */
export async function POST(req: NextRequest) {
  let supabase;
  try {
    supabase = getSupabaseFromRequest(req);
  } catch {
    return unauthorized("Envie Authorization: Bearer <JWT>.");
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return unauthorized("JWT inválido ou expirado.", userError?.message);
  }

  let body: { title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "JSON inválido." },
      { status: 400 }
    );
  }

  if (!body.title || !body.description) {
    return NextResponse.json(
      {
        error: "validation_error",
        message: "title e description são obrigatórios.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      title: body.title,
      description: body.description,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "42501") {
      return forbidden("RLS bloqueou a inserção.");
    }

    return NextResponse.json(
      {
        error: "insert_failed",
        message: "Falha ao criar ticket.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
