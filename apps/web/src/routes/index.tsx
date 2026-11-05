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
import { NotFound } from "../pages/NotFound";
import { OnboardingPage } from "../auth/OnboardingPage";
import { RecoveryPage } from "../auth/RecoveryPage";
import { ResetPasswordPage } from "../auth/ResetPasswordPage";
import { InvitationPage } from "../auth/InvitationPage";
import { Home } from "../pages/Home";
import { AppLayout } from "../components/layouts/AppLayout";
import { AuthLayout } from "../components/layouts/AuthLayout";
import { SectionLayout } from "../components/layouts/SectionLayout.tsx";
import { FullPageLoading } from "../components/LoadingSpinner.tsx";

// Lazy load role-specific sections
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard.tsx"));
const InvitationsPage = lazy(() => import("../pages/admin/InvitationsPage.tsx"));
const JudgeInterface = lazy(() => import("../pages/judge/JudgeInterface.tsx"));
const RepresentativeConsole = lazy(() => import("../pages/representative/RepresentativeConsole.tsx"));
const ModeratorControls = lazy(() => import("../pages/moderator/ModeratorControls.tsx"));
const EventsList = lazy(() => import("../pages/events/EventsList.tsx"));
const EventsCreate = lazy(() => import("../pages/events/EventsCreate.tsx"));
const EventEdit = lazy(() => import("../pages/events/EventEdit.tsx"));
const EventInfo = lazy(() => import("../pages/events/EventInfo.tsx"));
const FoundationFixture = import.meta.env.DEV ? lazy(() => import("../components/ui/FoundationFixture.tsx")) : null;
const AccessFixture = import.meta.env.DEV ? lazy(() => import("../auth/AccessFixture.tsx")) : null;

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullPageLoading />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/onboarding" element={<AuthLayout><OnboardingPage /></AuthLayout>} />
      <Route path="/auth/forgot-password" element={<AuthLayout><RecoveryPage key="recovery" kind="recovery" /></AuthLayout>} />
      <Route path="/auth/resend-verification" element={<AuthLayout><RecoveryPage key="resend" kind="resend" /></AuthLayout>} />
      <Route path="/auth/correct-email" element={<AuthLayout><RecoveryPage key="correction" kind="correction" /></AuthLayout>} />
      <Route path="/auth/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />
      <Route path="/auth/accept-invitation" element={<AuthLayout><InvitationPage /></AuthLayout>} />
      {AccessFixture && <Route path="/__fixtures/access/:eventId" element={<LazyWrapper><AccessFixture /></LazyWrapper>} />}
      {FoundationFixture && <Route path="/__fixtures/foundation" element={<LazyWrapper><FoundationFixture /></LazyWrapper>} />}
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
            <VerifyEmailPage />
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
              <Route path="/events" element={<RequireAuth><EventsList /></RequireAuth>} />
              <Route path="/events/new" element={<RequireRole role="admin"><EventsCreate /></RequireRole>} />
              <Route path="/events/:id" element={<RequireAuth><EventInfo /></RequireAuth>} />
              <Route path="/events/:id/edit" element={<RequireRole role="admin"><EventEdit /></RequireRole>} />

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
                <Route path="invitations" element={<LazyWrapper><InvitationsPage /></LazyWrapper>} />
                <Route
                  index
                  element={
                    <LazyWrapper>
                      <AdminDashboard />
                    </LazyWrapper>
                  }
                />
                <Route path="*" element={<NotFound />} />
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
                <Route path="*" element={<NotFound />} />
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
                  element={<NotFound />}
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        }
      />
    </Routes>
  );
}
