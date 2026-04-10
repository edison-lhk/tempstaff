import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthProvider from "./contexts/AuthProvider";
import { SocketProvider } from "./contexts/SocketProvider";
import NavBar from "./components/layout/NavBar";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Public pages
import LandingPage from "./pages/public/LandingPage";
import LoginPage from "./pages/public/LoginPage";
import RegisterUserPage from "./pages/public/RegisterUserPage";
import RegisterBusinessPage from "./pages/public/RegisterBusinessPage";
import ActivateAccountPage from "./pages/public/ActivateAccountPage";
import RequestResetPage from "./pages/public/RequestResetPage";
import CompleteResetPage from "./pages/public/CompleteResetPage";
import BusinessesPage from "./pages/public/BusinessesPage";
import BusinessDetailPage from "./pages/public/BusinessDetailPage";

// Regular pages
import UserDashboardPage from "./pages/regular/UserDashboardPage";
import UserProfilePage from "./pages/regular/UserProfilePage";
import EditUserProfilePage from "./pages/regular/EditUserProfilePage";
import UserQualificationsPage from "./pages/regular/UserQualificationsPage";
import QualificationDetailPage from "./pages/regular/QualificationDetailPage";
import JobsPage from "./pages/regular/JobsPage";
import JobDetailPage from "./pages/regular/JobDetailPage";
import InvitationsPage from "./pages/regular/InvitationsPage";
import InterestsPage from "./pages/regular/InterestsPage";
import UserCommitmentsPage from "./pages/regular/UserCommitmentsPage";

// Business pages
import BusinessDashboardPage from "./pages/business/BusinessDashboardPage";
import BusinessProfilePage from "./pages/business/BusinessProfilePage";
import EditBusinessProfilePage from "./pages/business/EditBusinessProfilePage";
import BusinessJobsPage from "./pages/business/BusinessJobsPage";
import CreateJobPage from "./pages/business/CreateJobPage";
import EditJobPage from "./pages/business/EditJobPage";
import BusinessJobDetailPage from "./pages/business/BusinessJobDetailPage";
import CandidatesPage from "./pages/business/CandidatesPage";
import CandidateDetailPage from "./pages/business/CandidateDetailPage";
import JobInterestsPage from "./pages/business/JobInterestsPage";

// Admin pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminBusinessesPage from "./pages/admin/AdminBusinessesPage";
import AdminPositionTypesPage from "./pages/admin/AdminPositionTypesPage";
import AdminQualificationsPage from "./pages/admin/AdminQualificationsPage";
import AdminQualificationDetailPage from "./pages/admin/AdminQualificationDetailPage";
import AdminSystemConfigPage from "./pages/admin/AdminSystemConfigPage";

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <NavBar />

          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register/user" element={<RegisterUserPage />} />
            <Route path="/register/business" element={<RegisterBusinessPage />} />
            <Route path="/activate/:resetToken" element={<ActivateAccountPage />} />
            <Route path="/reset/request" element={<RequestResetPage />} />
            <Route path="/reset/:resetToken" element={<CompleteResetPage />} />
            <Route path="/businesses" element={<BusinessesPage />} />
            <Route path="/businesses/:businessId" element={<BusinessDetailPage />} />

            <Route element={<ProtectedRoute allowedRoles={["regular"]} />}>
              <Route path="/user" element={<UserDashboardPage />} />
              <Route path="/user/profile" element={<UserProfilePage />} />
              <Route path="/user/profile/edit" element={<EditUserProfilePage />} />
              <Route path="/user/qualifications" element={<UserQualificationsPage />} />
              <Route path="/user/qualifications/:id" element={<QualificationDetailPage />} />
              <Route path="/user/jobs" element={<JobsPage />} />
              <Route path="/user/jobs/:jobId" element={<JobDetailPage />} />
              <Route path="/user/invitations" element={<InvitationsPage />} />
              <Route path="/user/interests" element={<InterestsPage />} />
              <Route path="/user/commitments" element={<UserCommitmentsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["business"]} />}>
              <Route path="/business" element={<BusinessDashboardPage />} />
              <Route path="/business/profile" element={<BusinessProfilePage />} />
              <Route path="/business/profile/edit" element={<EditBusinessProfilePage />} />
              <Route path="/business/jobs" element={<BusinessJobsPage />} />
              <Route path="/business/jobs/new" element={<CreateJobPage />} />
              <Route path="/business/jobs/:jobId" element={<BusinessJobDetailPage />} />
              <Route path="/business/jobs/:jobId/edit" element={<EditJobPage />} />
              <Route path="/business/jobs/:jobId/candidates" element={<CandidatesPage />} />
              <Route path="/business/jobs/:jobId/candidates/:userId" element={<CandidateDetailPage />} />
              <Route path="/business/jobs/:jobId/interests" element={<JobInterestsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/businesses" element={<AdminBusinessesPage />} />
              <Route path="/admin/position-types" element={<AdminPositionTypesPage />} />
              <Route path="/admin/qualifications" element={<AdminQualificationsPage />} />
              <Route path="/admin/qualifications/:qualificationId" element={<AdminQualificationDetailPage />} />
              <Route path="/admin/system" element={<AdminSystemConfigPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
