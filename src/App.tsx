import { Route, Routes } from "react-router";
import { SiteLayout } from "./components/SiteLayout";
import { AssistancePage } from "./pages/AssistancePage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { IncidentDetailPage } from "./pages/IncidentDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ReportPage } from "./pages/ReportPage";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import { SignInPage } from "./pages/SignInPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminIncidentPage } from "./pages/AdminIncidentPage";
import { AboutPage } from "./pages/AboutPage";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/assistance" element={<AssistancePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/register" element={<SignInPage register />} />
        <Route path="/report" element={<RequireAuth><ReportPage /></RequireAuth>} />
        <Route path="/confirmation/:incidentId" element={<RequireAuth><ConfirmationPage /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/history/:incidentId" element={<RequireAuth><IncidentDetailPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        <Route path="/admin/incidents/:incidentId" element={<RequireAdmin><AdminIncidentPage /></RequireAdmin>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
