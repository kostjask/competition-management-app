import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useTranslation } from "./i18n/useTranslation";
import { useLanguage } from "./i18n/useLanguage";
import type { Locale } from "./i18n/LanguageContext";

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

function About() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t('Studio.formName')}</h1>
      <p className="mt-2 text-slate-600">Built with Vite + React + Tailwind.</p>
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
            <Link className="font-semibold hover:text-blue-600" to="/about">About</Link>
          </div>
          <LanguageSelector />
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App
