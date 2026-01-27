import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Falha ao listar tickets." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body?.title) {
    return NextResponse.json(
      { error: "Título é obrigatório." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("tickets").insert({
    title: body.title,
    description: body.description ?? null,
    status: "open",
    // tenant_id e created_by vêm do RLS
  });

  if (error) {
    return NextResponse.json(
      { error: "Falha ao criar ticket." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}