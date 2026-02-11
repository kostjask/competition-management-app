import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { useAuth } from "./useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    clearError();

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-96px)] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 py-10">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-100 opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-slate-200 opacity-60 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-center">
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">Competition access</p>
          <h1 className="mt-4 font-display text-4xl text-slate-900 sm:text-5xl">Welcome back</h1>
          <p className="mt-4 text-base text-slate-600">
            Sign in to manage schedules, score submissions, and studio communication.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Live stage updates and judging tools.
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Secure access tied to your role.
            </div>
          </div>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Use the account you registered for the event.</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <div className="mt-1 flex items-center rounded-lg border border-slate-300 px-3 py-2 focus-within:border-blue-500">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
            {(formError || error) && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError || error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            New here?{" "}
            <Link className="font-semibold text-blue-600 hover:text-blue-500" to="/auth/register">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
