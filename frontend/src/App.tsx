import { Navigate, Route, Routes } from "react-router-dom"

import HomePage from "./HomePage"
import LoginPage from "./LoginPage"
import ForgotPasswordPage from "./ForgotPasswordPage"
import RegisterPage from "./RegisterPage"
import ResetPasswordPage from "./ResetPasswordPage"
import AdminPage from "./AdminPage"
import MaterialsPage from "./MaterialsPage"
import SearchPage from "./SearchPage"
import ReportsPage from "./ReportsPage"
import LearningPage from "./LearningPage"
import MaterialPage from "./MaterialPage"
import ContactPage from "./ContactPage"
import GrantsPage from "./GrantsPage"
import CreatorPage from "./CreatorPage"
import ProblemReportPage from "./ProblemReportPage"
import { RequireAdmin, RequireAuth } from "./lib/auth"
import { MatchmakingPage } from "./features/matchmaking/MatchmakingPage"
import { InnovationsPage } from "./features/innovations/InnovationsPage"
import { InnovationPage } from "./features/innovations/InnovationPage"
import { TesterPage } from "./features/tester/TesterPage"
import { TestDetailPage } from "./features/tester/TestDetailPage"
import { FeedbackPage } from "./features/tester/FeedbackPage"
import { MyApplicationsPage } from "./features/tester/MyApplicationsPage"
import AdminLayout from "./features/admin/AdminLayout"
import AdminDashboardPage from "./features/admin/AdminDashboardPage"
import AdminInnovationsPage from "./features/admin/AdminInnovationsPage"
import AssistantPage from "./features/assistant/AssistantPage"

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chat" element={<AssistantPage />} />
      <Route path="/materialy" element={<MaterialsPage />} />
      <Route path="/kategoria/:category" element={<MaterialsPage />} />
      <Route path="/temat/:topic" element={<MaterialsPage />} />
      <Route path="/raporty" element={<ReportsPage />} />
      <Route path="/nauka" element={<LearningPage />} />
      <Route path="/granty" element={<GrantsPage />} />
      <Route path="/szukaj" element={<SearchPage />} />
      <Route path="/material/:slug" element={<MaterialPage />} />
      <Route path="/kontakt" element={<ContactPage />} />
      <Route path="/matchmaking" element={<MatchmakingPage />} />
      <Route path="/kreator" element={<CreatorPage />} />
      <Route path="/zglos-problem" element={<ProblemReportPage />} />
      <Route path="/innowacje" element={<InnovationsPage />} />
      <Route path="/innowacja/:innovationId" element={<InnovationPage />} />
      <Route path="/tester" element={<TesterPage />} />
      <Route
        path="/tester/moje"
        element={
          <RequireAuth>
            <MyApplicationsPage />
          </RequireAuth>
        }
      />
      <Route path="/tester/feedback/:applicationId" element={<FeedbackPage />} />
      <Route path="/tester/:testId" element={<TestDetailPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/sign-in" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="innowacje" element={<AdminInnovationsPage />} />
        <Route path="cache" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
