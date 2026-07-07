import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { color } from "@runup/ui/tokens";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "RunUp — Treinador",
  description: "Dashboard do treinador RunUp",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body
        style={{
          margin: 0,
          background: color.surface0,
          color: color.textPrimary,
          fontFamily: "var(--font-poppins), system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
