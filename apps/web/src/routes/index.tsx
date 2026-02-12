import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RequireRole, RequireGuest, LoginPage, RegisterPage, VerifyEmailPage } from "../auth";
import { Home } from "../pages/Home";
// import { AdminDashboard } from "../pages/admin/AdminDashboard.tsx";
// import { JudgeInterface } from "../pages/judge/JudgeInterface.tsx";
// import { RepresentativeConsole } from "../pages/representative/RepresentativeConsole.tsx";
// import { ModeratorControls } from "../pages/moderator/ModeratorControls.tsx";
import { SectionLayout } from "../components/layouts/SectionLayout.tsx";
import { LoadingSpinner } from "../components/LoadingSpinner.tsx";

// Lazy load role-specific sections
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard.tsx"));
const JudgeInterface = lazy(() => import("../pages/judge/JudgeInterface.tsx"));
const RepresentativeConsole = lazy(() => import("../pages/representative/RepresentativeConsole.tsx"));
const ModeratorControls = lazy(() => import("../pages/moderator/ModeratorControls.tsx"));

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}


export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      
      {/* Auth routes */}
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      <Route path="/auth/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
      <Route path="/auth/register" element={<RequireGuest><RegisterPage /></RequireGuest>} />
      <Route path="/verify-email" element={<RequireGuest><VerifyEmailPage /></RequireGuest>} />

      {/* Role-based routes with code splitting */}
      <Route path="/admin/*" element={<RequireRole role="admin"><SectionLayout /></RequireRole>}>
        <Route index element={<LazyWrapper><AdminDashboard /></LazyWrapper>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      <Route path="/judge/*" element={<RequireRole role="judge"><SectionLayout /></RequireRole>}>
        <Route index element={<LazyWrapper><JudgeInterface /></LazyWrapper>} />
        <Route path="*" element={<Navigate to="/judge" replace />} />
      </Route>

      <Route path="/representative/*" element={<RequireRole role="representative"><SectionLayout /></RequireRole>}>
        <Route index element={<LazyWrapper><RepresentativeConsole /></LazyWrapper>} />
        <Route path="*" element={<Navigate to="/representative" replace />} />
      </Route>

      <Route path="/moderator/*" element={<RequireRole role="moderator"><SectionLayout /></RequireRole>}>
        <Route index element={<LazyWrapper><ModeratorControls /></LazyWrapper>} />
        <Route path="*" element={<Navigate to="/moderator" replace />} />
      </Route>
    </Routes>
  );
}