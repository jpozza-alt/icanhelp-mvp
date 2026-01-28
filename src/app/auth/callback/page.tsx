import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Processando autenticação...</div>}>
      <CallbackClient />
    </Suspense>
  );
}
