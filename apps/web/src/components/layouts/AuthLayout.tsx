import { LanguageSelector } from "../LanguageSelector";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const handleHomeClick = () => {
    // Hard redirect to home to prevent any form submission detection
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="flex items-center justify-between px-6 py-2 shadow bg-white min-h-16">
        <button
          onClick={handleHomeClick}
          className="font-semibold hover:text-blue-600 focus:outline-none cursor-pointer"
          type="button"
        >
          Home
        </button>
        <LanguageSelector />
      </nav>
      {children}
    </div>
  );
}
