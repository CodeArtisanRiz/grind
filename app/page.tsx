"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const T = {
  bg: "#0C0C0D", card: "#131315", border: "#1C1C20", borderHi: "#2A2A30",
  accent: "#D4FF00", text: "#EFEFEF", sub: "#666672", faint: "#1A1A1E",
};

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    background: T.faint, border: `1px solid ${T.borderHi}`,
    color: T.text, fontSize: 15, fontFamily: "'Syne'", outline: "none",
    marginBottom: 10,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);

    if (mode === "signup") {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
    }

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/workout");
    }
  };

  return (
    <div style={{ fontFamily: "'Syne', sans-serif", background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 8, color: T.accent }}>GRIND</div>
          <div style={{ fontSize: 12, color: T.sub, letterSpacing: 3, marginTop: 4, fontFamily: "'JetBrains Mono'" }}>WORKOUT TRACKER</div>
        </div>

        <div style={{ background: T.card, borderRadius: 20, padding: 28, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", background: T.faint, borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'Syne'", fontWeight: 700, fontSize: 13, letterSpacing: 1.5, transition: "all 0.15s", background: mode === m ? T.accent : "none", color: mode === m ? "#0C0C0D" : T.sub }}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)" style={inputStyle} />
            )}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={inputStyle} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required minLength={6} style={{ ...inputStyle, marginBottom: 0 }} />

            {error && (
              <div style={{ color: "#FF6B6B", fontSize: 12, fontFamily: "'JetBrains Mono'", marginTop: 10, textAlign: "center" }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: "100%", marginTop: 16, padding: "15px 0", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "'Syne'", fontWeight: 800, fontSize: 15, letterSpacing: 2, background: T.accent, color: "#0C0C0D", opacity: loading ? 0.6 : 1 }}>
              {loading ? "..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
