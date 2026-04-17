import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

import Landing from "@/pages/Landing";
import AuthCallback from "@/pages/AuthCallback";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import CalendarView from "@/pages/CalendarView";
import Settings from "@/pages/Settings";
import Subjects from "@/pages/Subjects";
import Exams from "@/pages/Exams";
import Clients from "@/pages/Clients";
import TimeTracker from "@/pages/TimeTracker";
import Payments from "@/pages/Payments";
import ContentSchedule from "@/pages/ContentSchedule";
import Ideas from "@/pages/Ideas";
import ProtectedRoute from "@/components/ProtectedRoute";

function LandingRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.profile_type ? "/dashboard" : "/onboarding"} replace />;
  return <Landing />;
}

function AppRouter() {
  const location = useLocation();
  // Handle OAuth return — session_id appears in URL fragment
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/onboarding" element={
        <ProtectedRoute requireProfile={false}><Onboarding /></ProtectedRoute>
      } />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/student/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
      <Route path="/student/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
      <Route path="/freelancer/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/freelancer/time" element={<ProtectedRoute><TimeTracker /></ProtectedRoute>} />
      <Route path="/freelancer/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/creator/content" element={<ProtectedRoute><ContentSchedule /></ProtectedRoute>} />
      <Route path="/creator/ideas" element={<ProtectedRoute><Ideas /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
            <Toaster position="bottom-right" />
          </AuthProvider>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}
