"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Onjuist wachtwoord. Probeer het opnieuw.");
        return;
      }
      router.push(params.get("from") || "/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 400 }}>
      <div className="card" style={{ marginTop: 60, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 36 }}>🔒</div>
        <h1 style={{ margin: "10px 0 4px" }}>Inloggen</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0 }}>
          Dit gedeelte is alleen voor beheerders.
        </p>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", marginTop: 8 }}
          />
          {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>{error}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 14 }}>
            {busy ? "Bezig..." : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
