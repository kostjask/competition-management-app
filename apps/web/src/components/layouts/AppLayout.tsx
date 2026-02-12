import { Link } from "react-router-dom";
import { AuthNav } from "../../auth";
import { LanguageSelector } from "../LanguageSelector";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="flex items-center justify-between px-6 py-4 shadow bg-white">
        <div className="flex items-center gap-4">
          <Link className="font-semibold hover:text-blue-600" to="/">Home</Link>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <AuthNav />
        </div>
      </nav>
      {children}
    </div>
  );
}