import type { Metadata } from "next";
import { color } from "@runup/ui/tokens";

export const metadata: Metadata = {
  title: "RunUp — Treinador",
  description: "Dashboard do treinador RunUp",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          background: color.surface0,
          color: color.textPrimary,
          fontFamily: "Poppins, system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
