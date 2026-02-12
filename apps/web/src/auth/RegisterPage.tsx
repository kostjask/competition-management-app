import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { register } from "../api/auth";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({ name, email, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-[calc(100vh-96px)] overflow-hidden bg-linear-to-br from-slate-50 via-white to-emerald-50 px-6 py-10">
        <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-emerald-100 opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-10 h-56 w-56 rounded-full bg-slate-200 opacity-60 blur-3xl" />
        
        <div className="relative mx-auto flex w-full max-w-md flex-col items-center justify-center pt-20">
          <div className="w-full rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-8 w-8 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-slate-900">
                Check your email
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                We've sent a verification link to <strong>{email}</strong>
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Click the link in the email to verify your account and get started.
              </p>
              <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-600">
                  <strong>Didn't receive the email?</strong> Check your spam folder or contact support.
                </p>
              </div>
              <Link
                to="/auth/login"
                className="mt-6 block text-sm font-semibold text-emerald-600 hover:text-emerald-500"
              >
                Already verified? Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-96px)] overflow-hidden bg-linear-to-br from-slate-50 via-white to-emerald-50 px-6 py-10">
      <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-emerald-100 opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-10 h-56 w-56 rounded-full bg-slate-200 opacity-60 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-center">
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-500">New account</p>
          <h1 className="mt-4 font-display text-4xl text-slate-900 sm:text-5xl">Join the season</h1>
          <p className="mt-4 text-base text-slate-600">
            Create a profile for your studio and keep schedules, registrations, and scores in sync.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Register dancers and performances quickly.
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Stay in sync with event organizers.
            </div>
          </div>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Create account</h2>
            <p className="mt-2 text-sm text-slate-500">You can log in right after you register.</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Full name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <div className="mt-1 flex items-center rounded-lg border border-slate-300 px-3 py-2 focus-within:border-emerald-500">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                  className="w-full border-none bg-transparent text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link className="font-semibold text-emerald-600 hover:text-emerald-500" to="/auth/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
