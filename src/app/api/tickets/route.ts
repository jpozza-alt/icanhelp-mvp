import { NextResponse } from "next/server";
import { createClient } from "@\/lib/supabase/server";
import { z } from "zod";
import { ticketCreateSchema } from "@\/lib/validators/ticket";

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = ticketCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const payload = parsed.data;
  const insert = {
    title: payload.title,
    description: payload.description || null,
    created_by: user.id,
    assigned_to: payload.assigned_to ? payload.assigned_to : null,
  };

  const { data, error } = await supabase.from("tickets").insert(insert).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ticket: data }, { status: 201 });
}
