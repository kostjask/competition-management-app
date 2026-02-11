import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function AuthNav() {
  const { user, hasToken, loading, error, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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

  if (!hasToken) {
    return (
      <div className="flex items-center gap-3">
        <Link className="font-semibold text-slate-700 hover:text-slate-900" to="/auth/login">
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

  if (loading || !user || error) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          {error ? "Session expired" : "Loading profile..."}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-rose-200 hover:text-rose-600"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden sm:inline">{user.name}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
          role="menu"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-2 pb-3">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-rose-200 hover:text-rose-600"
            role="menuitem"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
