import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import UploadDataPage from "@/pages/UploadDataPage";
import UploadHistoryPage from "@/pages/UploadHistoryPage";
import AllQueriesPage from "@/pages/AllQueriesPage";
import MyQueriesPage from "@/pages/MyQueriesPage";
import EscalationQueuePage from "@/pages/EscalationQueuePage";
import EscalationRepositoryPage from "@/pages/EscalationRepositoryPage";
import SLAMonitorPage from "@/pages/SLAMonitorPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ReportsPage from "@/pages/ReportsPage";
import UserManagementPage from "@/pages/UserManagementPage";
import DocumentVerificationPage from "@/pages/DocumentVerificationPage";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/my-queries" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/upload" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/upload" replace />} />
        <Route path="upload" element={<UploadDataPage />} />
        <Route path="upload-history" element={<UploadHistoryPage />} />
        <Route path="all-queries" element={<ProtectedRoute adminOnly><AllQueriesPage /></ProtectedRoute>} />
        <Route path="my-queries" element={<MyQueriesPage />} />
        <Route path="escalation-queue" element={<EscalationQueuePage />} />
        <Route path="escalation-repository" element={<EscalationRepositoryPage />} />
        <Route path="sla-monitor" element={<SLAMonitorPage />} />
        <Route path="document-verification" element={<DocumentVerificationPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
        <Route path="user-management" element={<ProtectedRoute adminOnly><UserManagementPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <AppRoutes />
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
