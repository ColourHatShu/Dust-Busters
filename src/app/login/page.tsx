"use client";

import { useState } from "react";
import Link from "next/link";
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
    <main className="auth-shell relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-16">
      {/* Aurora backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <span className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-[90px]" />
        <span className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-sky-500/20 blur-[90px]" />
        <span className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-teal-400/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand + heading */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 shadow-[0_0_22px_-4px_rgba(16,185,129,0.7)]" />
            <span className="text-gradient-on-dark text-2xl font-bold">
              Dust Busters
            </span>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-slate-400">
              {mode === "login"
                ? "Log in to book your next cleaning"
                : "Join Dust Busters in under a minute"}
            </p>
          </div>
        </div>

        {/* Glass auth card */}
        <form
          onSubmit={submit}
          className="auth-card mt-7 flex flex-col gap-5 rounded-2xl p-7"
        >
          {mode === "signup" && (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">Full name</span>
              <input
                className="input-dark"
                placeholder="John Doe"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-300">Email</span>
            <input
              className="input-dark"
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
              <span className="text-sm font-medium text-slate-300">Password</span>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={forgotPassword}
                  className="text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                className="input-dark pr-11"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
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
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-200">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3.5 text-sm text-red-200">
              {error}
            </div>
          )}

          <button className="btn-base btn-glow mt-1" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            className="text-sm font-medium text-emerald-300 transition hover:text-emerald-200"
            onClick={switchMode}
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </main>
  );
}
