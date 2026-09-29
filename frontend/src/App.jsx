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
import ProblemEditorPage from "./pages/ProblemEditorPage";
import TestCasesPage from "./pages/TestCasesPage";
import AdminPage from "./pages/AdminPage";
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
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.inProgress);
   const [retryCount, setRetryCount] = useState(0);

   useEffect(() => {
      let cancelled = false;

      const restoreSession = async () => {
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

   const onRetry = () => {
      setApiStatus(apiStatusConstants.inProgress);
      setRetryCount((count) => count + 1);
   };

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

   // Ends every other session. This device stays signed in on a fresh token,
   // because bumping tokenVersion killed the old one too.
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
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/problems/:slug" element={<ProblemPage />} />
            <Route path="/u/:username" element={<ProfilePage />} />

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

            {/* Reached from an email link or after being signed out, so these
                stay open: a signed-in person can still be holding one. */}
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/signed-out" element={<SignedOutPage />} />

            <Route element={<ProtectedRoutes />}>
               <Route path="/submissions" element={<SubmissionsPage />} />
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
                  element={<ProblemEditorPage />}
               />
               <Route
                  path="/setter/problems/:problemId"
                  element={<ProblemEditorPage />}
               />
               <Route
                  path="/setter/problems/:problemId/test-cases"
                  element={<TestCasesPage />}
               />
            </Route>

            <Route element={<RoleRoutes allow={ADMIN} />}>
               <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/problems" replace />} />
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
