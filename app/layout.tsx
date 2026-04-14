import "../src/app/globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "icanHelp",
  description: "Plataforma institucional com metodo, clareza e trilha.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className + " min-h-screen bg-[#F7F8FA] text-[#22313F] antialiased"}>
        {children}
      </body>
    </html>
  );
}