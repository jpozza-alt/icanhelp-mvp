import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  const body = await request.json();
  const { title } = body;

  if (!title) {
    return NextResponse.json(
      { error: "title é obrigatório" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tickets")
    .insert({ title })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}