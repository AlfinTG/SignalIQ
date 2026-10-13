import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { DashboardPage } from "./pages/DashboardPage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { InsightsPage } from "./pages/InsightsPage";
import { PrioritiesPage } from "./pages/PrioritiesPage";
import { LandingPage } from "./pages/LandingPage";
import { PublicFormPage } from "./pages/PublicFormPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { DataQualityPage } from "./pages/DataQualityPage";
import { AuthPage } from "./pages/AuthPage";
import { UnavailableFeaturePage } from "./pages/UnavailableFeaturePage";
import { AuthProvider, useAuth } from "./context/AuthContext";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { configured, loading, session } = useAuth();
  const location = useLocation();
  if (loading) return <main className="grid min-h-screen place-items-center bg-canvas text-sm text-ink-muted">Checking your session…</main>;
  if (!configured || !session) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/sign-in" element={<AuthPage />} />
        <Route path="/sign-up" element={<AuthPage />} />
        <Route path="/recover" element={<AuthPage />} />
        <Route path="/reset-password" element={<AuthPage />} />
        {/* Standalone public form for external end users & embedded widgets */}
        <Route path="/f/:formId" element={<PublicFormPage />} />

        {/* Protected SaaS App Shell */}
        <Route element={<RequireAuth><WorkspaceProvider><AppShell /></WorkspaceProvider></RequireAuth>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/builder" element={<UnavailableFeaturePage />} />
          <Route path="/installation" element={<UnavailableFeaturePage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/priorities" element={<PrioritiesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/quality" element={<DataQualityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/adaption-lab" element={<UnavailableFeaturePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
