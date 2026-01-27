"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function TopBar() {
  const router = useRouter();
  async function sair(){
    await supabase.auth.signOut();
    router.replace("/login");
  }
  return (
    <div className="fixed top-0 left-0 right-0 flex items-center justify-end gap-3 px-4 py-3 bg-gray-900/60 backdrop-blur">
      <button onClick={sair} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
        Sair
      </button>
    </div>
  );
}
