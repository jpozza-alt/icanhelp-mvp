import "../src/app/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "icanHelp",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        {children}
      </body>
    </html>
  );
}
