import { color } from "@runup/ui/tokens";

export default function Home() {
  return (
    <main style={{ padding: 48, maxWidth: 640 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
        Run<span style={{ color: color.orange500 }}>Up</span>
      </h1>
      <p style={{ color: color.textSecondary, marginTop: 8 }}>
        Dashboard do treinador — M0 no ar.
      </p>
    </main>
  );
}
