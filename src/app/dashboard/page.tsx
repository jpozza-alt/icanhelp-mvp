"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

import { TopBar } from '../../components/TopBar';

export default function Dashboard() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) router.replace("/login");
      else setEmail(data.user.email ?? "");
    });
  }, [router]);

  async function sair(){
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <TopBar />`r`n    <main className="min-h-screen w-full bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-gray-800 rounded-xl shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Bem-vindo ao icanHelp</h1>
        {email && <p className="mt-2 text-gray-300">{email}</p>}
        <button
          onClick={sair}
          className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700"
        >
          Sair
        </button>
      </div>
    </main>
  );
}

