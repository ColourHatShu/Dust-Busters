"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      setBusy(false);
      if (error) return setError(error.message);
      // When email confirmation is enabled, signUp succeeds but returns no
      // session — the user must confirm via email before they can log in.
      if (!data.session) {
        setNotice(
          "Almost there! Check your inbox to confirm your email, then log in.",
        );
        setMode("login");
        setPassword("");
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  async function forgotPassword() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email above first, then tap “Forgot password?”.");
      return;
    }
    const supabase = createClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) return setError(error.message);
    setNotice("If that email exists, we’ve sent a password reset link.");
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
    setNotice(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 p-6">
      <div className="space-y-3 text-center">
        <h1>{mode === "login" ? "Welcome back" : "Join us"}</h1>
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
              autoComplete="name"
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
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">Password</span>
            {mode === "login" && (
              <button
                type="button"
                onClick={forgotPassword}
                className="text-xs font-medium text-accent transition hover:text-accent-dark"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              className="input-modern pr-11"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </label>

        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-elevation-sm">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-elevation-sm">
            {error}
          </div>
        )}

        <button className="btn-base btn-primary mt-2" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>
      </form>

      <div className="text-center">
        <button
          className="text-sm font-medium text-accent transition hover:text-accent-dark"
          onClick={switchMode}
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </div>
    </main>
  );
}
