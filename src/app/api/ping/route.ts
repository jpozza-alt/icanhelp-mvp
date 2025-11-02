export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return new Response(JSON.stringify({ ok: true, supabaseUrl: url }), { headers: { "content-type": "application/json" } });
}
