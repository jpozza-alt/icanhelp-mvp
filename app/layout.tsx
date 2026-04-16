import "../src/app/globals.css";
import type { ReactNode } from "react";
export const metadata = {
  title: "icanHelp",
  description: "Plataforma institucional com metodo, clareza e trilha.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
