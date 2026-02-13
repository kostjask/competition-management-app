import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  RequireRole,
  RequireGuest,
  RequireAuth,
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  ProfilePage,
} from "../auth";
import { Home } from "../pages/Home";
import { AppLayout } from "../components/layouts/AppLayout";
import { AuthLayout } from "../components/layouts/AuthLayout";
import { SectionLayout } from "../components/layouts/SectionLayout.tsx";
import { FullPageLoading } from "../components/LoadingSpinner.tsx";

// Lazy load role-specific sections
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard.tsx"));
const JudgeInterface = lazy(() => import("../pages/judge/JudgeInterface.tsx"));
const RepresentativeConsole = lazy(() => import("../pages/representative/RepresentativeConsole.tsx"));
const ModeratorControls = lazy(() => import("../pages/moderator/ModeratorControls.tsx"));
const EventsList = lazy(() => import("../pages/events/EventsList.tsx"));
const EventsCreate = lazy(() => import("../pages/events/EventsCreate.tsx"));
const EventEdit = lazy(() => import("../pages/events/EventEdit.tsx"));
const EventInfo = lazy(() => import("../pages/events/EventInfo.tsx"));

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullPageLoading />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes - isolated layout without navigation */}
      <Route
        path="/auth/login"
        element={
          <AuthLayout>
            <RequireGuest>
              <LoginPage />
            </RequireGuest>
          </AuthLayout>
        }
      />
      <Route
        path="/auth/register"
        element={
          <AuthLayout>
            <RequireGuest>
              <RegisterPage />
            </RequireGuest>
          </AuthLayout>
        }
      />
      <Route
        path="/verify-email"
        element={
          <AuthLayout>
            <RequireGuest>
              <VerifyEmailPage />
            </RequireGuest>
          </AuthLayout>
        }
      />
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />

      {/* All other routes use AppLayout with navigation */}
      <Route
        path="/*"
        element={
          <AppLayout>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<EventsList />} />
              <Route path="/events/new" element={<EventsCreate />} />
              <Route path="/events/:id" element={<EventInfo />} />
              <Route path="/events/:id/edit" element={<EventEdit />} />

              {/* Profile */}
              <Route
                path="/auth/profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />

              {/* Role-based routes with code splitting */}
              <Route
                path="/admin/*"
                element={
                  <RequireRole role="admin">
                    <SectionLayout />
                  </RequireRole>
                }
              >
                <Route
                  index
                  element={
                    <LazyWrapper>
                      <AdminDashboard />
                    </LazyWrapper>
                  }
                />
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
                <Route
                  index
                  element={
                    <LazyWrapper>
                      <JudgeInterface />
                    </LazyWrapper>
                  }
                />
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
                <Route
                  index
                  element={
                    <LazyWrapper>
                      <RepresentativeConsole />
                    </LazyWrapper>
                  }
                />
                <Route
                  path="*"
                  element={<Navigate to="/representative" replace />}
                />
              </Route>

              <Route
                path="/moderator/*"
                element={
                  <RequireRole role="moderator">
                    <SectionLayout />
                  </RequireRole>
                }
              >
                <Route
                  index
                  element={
                    <LazyWrapper>
                      <ModeratorControls />
                    </LazyWrapper>
                  }
                />
                <Route
                  path="*"
                  element={<Navigate to="/moderator" replace />}
                />
              </Route>
            </Routes>
          </AppLayout>
        }
      />
    </Routes>
  );
}
