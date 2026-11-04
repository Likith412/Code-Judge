import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import {
   changePassword as changePasswordRequest,
   updateProfile as updateProfileRequest,
   login,
   logout,
   logoutEverywhere,
   refreshSession,
} from "./services/api/auth";
import { apiError } from "./services/api/client";
import { onSessionLost, setAccessToken } from "./services/api/tokenStore";

import UserContext from "./context/UserContext";

import Navbar from "./components/Navbar";
import FailureView from "./components/FailureView";
import GuestRoutes from "./components/GuestRoutes";
import ProtectedRoutes from "./components/ProtectedRoutes";
import RoleRoutes from "./components/RoleRoutes";
import SolverRoutes from "./components/SolverRoutes";
import { homePath } from "./utils/home";

import ProblemsPage from "./pages/ProblemsPage";
import ProblemPage from "./pages/ProblemPage";
import SubmissionsPage from "./pages/SubmissionsPage";
import SubmissionPage from "./pages/SubmissionPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import VerifyPage from "./pages/VerifyPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SignedOutPage from "./pages/SignedOutPage";
import SetterProblemsPage from "./pages/SetterProblemsPage";
import NewProblemPage from "./pages/NewProblemPage";
import SetterProblemPage from "./pages/SetterProblemPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AuditLogPage from "./pages/AuditLogPage";
import ContestsPage from "./pages/ContestsPage";
import ContestPage from "./pages/ContestPage";
import ContestEditorPage from "./pages/ContestEditorPage";
import NotFoundPage from "./pages/NotFoundPage";

import "./App.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const SETTER = ["SETTER", "ADMIN"];
const ADMIN = ["ADMIN"];

function App() {
   const [user, setUser] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [retryCount, setRetryCount] = useState(0);

   useEffect(() => {
      let cancelled = false;

      const restoreSession = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const { accessToken, user: signedIn } = await refreshSession();

            if (cancelled) return;

            setAccessToken(accessToken);
            setUser(signedIn);
            setApiStatus(apiStatusConstants.success);
         } catch (error) {
            if (cancelled) return;

            const { status } = apiError(error);

            // No cookie just means nobody is signed in. That is not an error.
            if (status === 401) {
               setUser(null);
               setApiStatus(apiStatusConstants.success);

               return;
            }

            console.error(error);
            setUser(null);
            setApiStatus(apiStatusConstants.failure);
         }
      };

      restoreSession();

      return () => {
         cancelled = true;
      };
   }, [retryCount]);

   // The interceptor gave up on a refresh, so the session is over.
   useEffect(() => onSessionLost(() => setUser(null)), []);

   const onRetry = () => setRetryCount((count) => count + 1);

   // Pages call this so the token and the user are always set together.
   const signIn = useCallback(async (credentials) => {
      const data = await login(credentials);

      setAccessToken(data.accessToken);
      setUser(data.user);

      return data.user;
   }, []);

   // The server hands back a new token and user, so this is a sign-in again.
   const changePassword = useCallback(async (body) => {
      const data = await changePasswordRequest(body);

      setAccessToken(data.accessToken);
      setUser(data.user);
   }, []);

   // Rewrites the user the navbar reads, so it goes through here too.
   const updateProfile = useCallback(async (changes) => {
      const data = await updateProfileRequest(changes);

      setUser(data.user);
   }, []);

   // Ends every other session. This one stays in, on a fresh token.
   const signOutEverywhere = useCallback(async () => {
      const data = await logoutEverywhere();

      setAccessToken(data.accessToken);
      setUser(data.user);

      return data.signedOutCount;
   }, []);

   const signOut = useCallback(async () => {
      try {
         await logout();
      } finally {
         setAccessToken(null);
         setUser(null);
      }
   }, []);

   const renderLoadingView = () => (
      <>
         <Navbar restoring />
         <main className="cj-main" />
      </>
   );

   const renderFailureView = () => (
      <>
         <Navbar restoring />
         <FailureView
            onRetry={onRetry}
            message="We could not reach the server to check your session. Please try again."
         />
      </>
   );

   const renderSuccessView = () => (
      <UserContext.Provider
         value={{
            user,
            signIn,
            signOut,
            signOutEverywhere,
            changePassword,
            updateProfile,
         }}
      >
         <Navbar />

         <Routes>
            {/* Open to everyone. */}
            {/* The list is for solvers. Setters and admins have their own. */}
            <Route element={<SolverRoutes />}>
               <Route path="/problems" element={<ProblemsPage />} />
            </Route>

            <Route path="/problems/:slug" element={<ProblemPage />} />
            <Route path="/u/:username" element={<ProfilePage />} />
            <Route path="/contests" element={<ContestsPage />} />
            <Route path="/contests/:slug" element={<ContestPage />} />
            <Route
               path="/contests/:contestSlug/problems/:slug"
               element={<ProblemPage />}
            />

            {/* Only before signing in. */}
            <Route element={<GuestRoutes />}>
               <Route path="/login" element={<LoginPage />} />
               <Route path="/register" element={<RegisterPage />} />
               <Route path="/check-email" element={<CheckEmailPage />} />
               <Route
                  path="/forgot-password"
                  element={<ForgotPasswordPage />}
               />
            </Route>

            {/* Open to all: a signed-in person can still hold one of these links. */}
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/signed-out" element={<SignedOutPage />} />

            <Route element={<ProtectedRoutes />}>
               <Route element={<SolverRoutes />}>
                  <Route path="/submissions" element={<SubmissionsPage />} />
               </Route>

               <Route
                  path="/submissions/:submissionId"
                  element={<SubmissionPage />}
               />

               <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route element={<RoleRoutes allow={SETTER} />}>
               <Route
                  path="/setter/problems"
                  element={<SetterProblemsPage />}
               />

               <Route
                  path="/setter/problems/new"
                  element={<NewProblemPage />}
               />

               {/* Editor and ?tab=test-cases; two segments, so no slug clashes with /new. */}
               <Route
                  path="/setter/problems/:slug/edit"
                  element={<SetterProblemPage />}
               />
            </Route>

            <Route element={<RoleRoutes allow={ADMIN} />}>
               {/* Users and the audit log are separate pages. */}
               <Route
                  path="/admin"
                  element={<Navigate to="/admin/users" replace />}
               />

               <Route path="/admin/users" element={<AdminUsersPage />} />
               <Route path="/admin/audit" element={<AuditLogPage />} />
               <Route
                  path="/admin/contests/new"
                  element={<ContestEditorPage />}
               />

               <Route
                  path="/admin/contests/:slug/edit"
                  element={<ContestEditorPage />}
               />
            </Route>

            <Route
               path="/"
               element={<Navigate to={homePath(user)} replace />}
            />

            <Route path="*" element={<NotFoundPage />} />
         </Routes>
      </UserContext.Provider>
   );

   switch (apiStatus) {
      case apiStatusConstants.success:
         return renderSuccessView();
      case apiStatusConstants.failure:
         return renderFailureView();
      case apiStatusConstants.inProgress:
         return renderLoadingView();
      default:
         return null;
   }
}

export default App;
