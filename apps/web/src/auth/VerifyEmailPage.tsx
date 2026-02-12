import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../api/auth";
import { setToken } from "../api/client";
import { useAuth } from "./useAuth";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [error, setError] = useState<string | null>(
    token ? null : "No verification token provided"
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyEmail({ token });
        
        // Token is automatically stored by the API client
        if (response.token) {
          setToken(response.token);
          await refreshUser();
        }
        
        setStatus("success");
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 3000);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      }
    };

    void verify();
  }, [token, navigate, refreshUser]);

  return (
    <div className="relative min-h-[calc(100vh-96px)] overflow-hidden bg-linear-to-br from-slate-50 via-white to-emerald-50 px-6 py-10">
      <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-emerald-100 opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-10 h-56 w-56 rounded-full bg-slate-200 opacity-60 blur-3xl" />
      
      <div className="relative mx-auto flex w-full max-w-md flex-col items-center justify-center pt-20">
        <div className="w-full rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur">
          {status === "loading" && (
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
              <h2 className="mt-6 text-2xl font-semibold text-slate-900">
                Verifying your email
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Please wait while we verify your account...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-6 w-6 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-slate-900">
                Email verified!
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Your email has been successfully verified. You're now logged in.
              </p>
              <p className="mt-4 text-sm text-slate-400">
                Redirecting to homepage in 3 sec...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <svg
                  className="h-6 w-6 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-slate-900">
                Verification failed
              </h2>
              <p className="mt-2 text-sm text-rose-600">
                {error || "Unable to verify your email. The link may be invalid or expired."}
              </p>
              <div className="mt-6 space-y-3">
                <Link
                  to="/auth/register"
                  className="block w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Register again
                </Link>
                <Link
                  to="/auth/login"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Go to login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
