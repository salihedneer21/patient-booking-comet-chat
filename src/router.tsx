import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AccountInactive from "./pages/auth/AccountInactive";
import ErrorPage from "./pages/Error";
import GuestRoute from "./components/auth/GuestRoute";
import AuthenticatedRoute from "./components/auth/AuthenticatedRoute";
import ActiveUserRoute from "./components/auth/ActiveUserRoute";
import AdminRoute from "./components/auth/AdminRoute";
import PatientRoute from "./components/auth/PatientRoute";
import ProviderRoute from "./components/auth/ProviderRoute";
import ProfilePage from "./pages/profile/ProfilePage";
import AdminLayout from "./components/modules/telehealth/admin/AdminLayout";

// Patient pages
import {
  IntakePage,
  PatientDashboardPage,
  PatientBookingsPage,
  ScheduleAppointmentPage,
  PatientMessagesPage,
  PatientHealthPage,
  PatientProfilePage,
  SupportPage,
} from "./pages/modules/telehealth/patient";

// Provider pages
import {
  ProviderDashboardPage,
  ProviderPatientsPage,
  PatientChartPage,
  EncounterPage,
  ProviderAvailabilityPage,
  ProviderMessagesPage,
  ProviderProfilePage,
  ProviderAppointmentsPage,
} from "./pages/modules/telehealth/provider";

// Admin pages
import {
  AdminDashboardPage,
  AdminAppointmentsPage,
  AdminEncountersPage,
  AdminMessagesPage,
  AdminPatientsPage,
  AdminPatientDetailPage,
  AdminProvidersPage,
  AdminProviderDetailPage,
  AdminSettingsPage,
} from "./pages/modules/telehealth/admin";

// Call pages
import { VideoCallPage } from "./pages/modules/telehealth/call";

export const router = createBrowserRouter([
  {
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      // Guest routes (unauthenticated users)
      {
        element: <GuestRoute />,
        children: [
          {
            path: "/login",
            element: <Login />,
          },
          {
            path: "/register",
            element: <Register />,
          },
          {
            path: "/forgot-password",
            element: <ForgotPassword />,
          },
        ],
      },
      // Authenticated routes (any authenticated user, even inactive)
      {
        element: <AuthenticatedRoute />,
        children: [
          {
            path: "/account-inactive",
            element: <AccountInactive />,
          },
        ],
      },
      // Profile routes (any active user)
      {
        element: <ActiveUserRoute />,
        children: [
          {
            path: "/profile",
            element: <ProfilePage />,
          },
          // Video call (accessible by all authenticated users)
          {
            path: "/call/:sessionId",
            element: <VideoCallPage />,
          },
        ],
      },
      // Patient routes
      {
        element: <PatientRoute />,
        children: [
          // Patient intake
          {
            path: "/intake",
            element: <IntakePage />,
          },
          // Patient dashboard and pages
          {
            path: "/patient/dashboard",
            element: <PatientDashboardPage />,
          },
          {
            path: "/patient/schedule",
            element: <ScheduleAppointmentPage />,
          },
          {
            path: "/patient/bookings",
            element: <PatientBookingsPage />,
          },
          {
            path: "/patient/messages",
            element: <PatientMessagesPage />,
          },
          {
            path: "/patient/health",
            element: <PatientHealthPage />,
          },
          {
            path: "/patient/profile",
            element: <PatientProfilePage />,
          },
          {
            path: "/patient/support",
            element: <SupportPage />,
          },
          // Legacy route redirect
          {
            path: "/patient",
            element: <PatientDashboardPage />,
          },
        ],
      },
      // Provider routes
      {
        element: <ProviderRoute />,
        children: [
          {
            path: "/provider/dashboard",
            element: <ProviderDashboardPage />,
          },
          {
            path: "/provider/patients",
            element: <ProviderPatientsPage />,
          },
          {
            path: "/provider/patients/:patientId/chart",
            element: <PatientChartPage />,
          },
          {
            path: "/provider/encounter/:encounterId",
            element: <EncounterPage />,
          },
          {
            path: "/provider/appointments",
            element: <ProviderAppointmentsPage />,
          },
          {
            path: "/provider/availability",
            element: <ProviderAvailabilityPage />,
          },
          {
            path: "/provider/messages",
            element: <ProviderMessagesPage />,
          },
          {
            path: "/provider/profile",
            element: <ProviderProfilePage />,
          },
          // Legacy route
          {
            path: "/provider",
            element: <ProviderDashboardPage />,
          },
        ],
      },
      // Admin routes
      {
        element: <AdminRoute />,
        children: [
          {
            path: "/admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: "dashboard", element: <AdminDashboardPage /> },
              { path: "appointments", element: <AdminAppointmentsPage /> },
              { path: "encounters", element: <AdminEncountersPage /> },
              { path: "patients", element: <AdminPatientsPage /> },
              { path: "patients/:patientId", element: <AdminPatientDetailPage /> },
              { path: "providers", element: <AdminProvidersPage /> },
              { path: "providers/:providerId", element: <AdminProviderDetailPage /> },
              { path: "messages", element: <AdminMessagesPage /> },
              { path: "settings", element: <AdminSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <ErrorPage />,
  },
]);

export type AppRoute = (typeof router)["routes"][number];
