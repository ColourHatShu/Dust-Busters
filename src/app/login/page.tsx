"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 p-6">
      <div className="space-y-3 text-center">
        <h1>
          {mode === "login" ? "Welcome back" : "Join us"}
        </h1>
        <p className="text-slate-600">
          {mode === "login"
            ? "Log in to book your next cleaning"
            : "Create an account to get started"}
        </p>
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-6">
        {mode === "signup" && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-900">Full name</span>
            <input
              className="input-modern"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-900">Email</span>
          <input
            className="input-modern"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-900">Password</span>
          <input
            className="input-modern"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200 shadow-elevation-sm">
            {error}
          </div>
        )}
        <button
          className="btn-base btn-primary mt-4"
          disabled={busy}
        >
          {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <div className="text-center">
        <button
          className="text-sm font-medium text-accent hover:text-accent-dark transition"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </div>
    </main>
  );
}
