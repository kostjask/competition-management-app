import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useTranslation } from "./i18n/useTranslation";
import { useLanguage } from "./i18n/useLanguage";
import type { Locale } from "./i18n/LanguageContext";
import { AuthNav, LoginPage, RegisterPage, RequireRole } from "./auth";

function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="px-3 py-2 border border-slate-300 rounded hover:border-blue-600 cursor-pointer"
    >
      <option value="et">🇪🇪 Eesti</option>
      <option value="en">🇬🇧 English</option>
      <option value="ru">🇷🇺 Русский</option>
    </select>
  );
}

function Home() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t('Common.save')}</h1>
      <p className="mt-2 text-slate-600">Welcome to the competition app.</p>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p className="mt-2 text-slate-600">Manage events, studios, and permissions.</p>
    </div>
  );
}

function JudgeInterface() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Judge Interface</h1>
      <p className="mt-2 text-slate-600">Score performances and review entries.</p>
    </div>
  );
}

function RepresentativeConsole() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Studio Management</h1>
      <p className="mt-2 text-slate-600">Manage dancers and performances.</p>
    </div>
  );
}

function ModeratorControls() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Moderator Controls</h1>
      <p className="mt-2 text-slate-600">Control stage flow and validate scores.</p>
    </div>
  );
}

function SectionLayout() {
  return (
    <div className="p-6">
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
          <Route path="/register" element={<Navigate to="/auth/register" replace />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />

          <Route
            path="/admin/*"
            element={
              <RequireRole role="admin">
                <SectionLayout />
              </RequireRole>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>

          <Route
            path="/judge/*"
            element={
              <RequireRole role="judge">
                <SectionLayout />
              </RequireRole>
            }
          >
            <Route index element={<JudgeInterface />} />
            <Route path="*" element={<Navigate to="/judge" replace />} />
          </Route>

          <Route
            path="/representative/*"
            element={
              <RequireRole role="representative">
                <SectionLayout />
              </RequireRole>
            }
          >
            <Route index element={<RepresentativeConsole />} />
            <Route path="*" element={<Navigate to="/representative" replace />} />
          </Route>

          <Route
            path="/moderator/*"
            element={
              <RequireRole role="moderator">
                <SectionLayout />
              </RequireRole>
            }
          >
            <Route index element={<ModeratorControls />} />
            <Route path="*" element={<Navigate to="/moderator" replace />} />
          </Route>

        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App
