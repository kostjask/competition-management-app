import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function AuthNav() {
  const { user, hasToken, loading, error, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const initials = (() => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  })();

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/auth/login", { replace: true });
  };

  const handleProfile = () => {
    setOpen(false);
    navigate("/auth/profile");
  };

  const showLoadingState = hasToken && (loading || (!user && !error));
  const isAuthenticated = hasToken && !!user && !error;

  if (!hasToken) {
    return (
      <div className="flex items-center gap-3">
        <Link
          className="font-semibold text-slate-700 hover:text-slate-900"
          to="/auth/login"
        >
          Log in
        </Link>
        <Link
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          to="/auth/register"
        >
          Sign up
        </Link>
      </div>
    );
  }

  if (showLoadingState) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 cursor-pointer"
          aria-busy="true"
          aria-live="polite"
          disabled
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-slate-900 to-slate-800 text-sm font-semibold leading-none text-white shadow-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          </span>
        </button>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 cursor-pointer"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-slate-900 to-slate-800 text-sm font-semibold leading-none text-white shadow-sm`}>
            {initials}
          </span>
        </button>

        {open && (
          <div
            className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            role="menu"
          >
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500 mt-1">{user.email}</p>
            </div>

            <div className="py-2 px-2 space-y-1">
              <button
                type="button"
                onClick={handleProfile}
                className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600 text-left cursor-pointer"
                role="menuitem"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Edit Profile
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600 text-left cursor-pointer"
                role="menuitem"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleLogout}
        className="flex h-11 items-center gap-3 rounded-full border border-slate-200 bg-white px-3 transition-all duration-200 hover:border-rose-200 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
          !
        </span>
        <span className="text-sm font-semibold text-slate-700">Log out</span>
      </button>
    </div>
  );
}
