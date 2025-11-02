"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Enviando...");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setStatus("Erro: " + error.message);
    else setStatus("✅ Link de acesso enviado para o e-mail!");
  }

  return (
    <main className="min-h-screen w-full bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Login — icanHelp</h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2">
            Enviar link de acesso
          </button>
        </form>
        {status && <p className="mt-3 text-sm text-gray-300">{status}</p>}
      </div>
    </main>
  );
}
