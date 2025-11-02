import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "icanHelp",
  description: "MVP icanHelp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-900 text-gray-100 min-h-screen">
        <div className="min-h-screen flex items-center justify-center p-6">
          {children}
        </div>
      </body>
    </html>
  );
}
