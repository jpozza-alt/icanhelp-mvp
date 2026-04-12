import { Suspense } from "react";
import CallbackClient from "../../../src/app/auth/callback/CallbackClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Processando autenticacao...</div>}>
      <CallbackClient />
    </Suspense>
  );
}