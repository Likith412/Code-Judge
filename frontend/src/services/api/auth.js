import client, { refreshSession } from "./client";

function getCurrentUser() {
   return client.get("/auth/me").then((response) => response.data);
}

function register({ username, email, password }) {
   return client
      .post("/auth/register", { username, email, password })
      .then((response) => response.data);
}

function verifyEmail(token) {
   return client
      .get("/auth/verify", { params: { token } })
      .then((response) => response.data);
}

function resendVerification({ email }) {
   return client
      .post("/auth/resend-verification", { email })
      .then((response) => response.data);
}

function forgotPassword({ email }) {
   return client
      .post("/auth/forgot-password", { email })
      .then((response) => response.data);
}

function resetPassword({ token, password }) {
   return client
      .post("/auth/reset-password", { token, password })
      .then((response) => response.data);
}

function login({ email, password }) {
   return client
      .post("/auth/login", { email, password })
      .then((response) => response.data);
}

function updateProfile(changes) {
   return client.patch("/auth/me", changes).then((response) => response.data);
}

function changePassword({ currentPassword, password }) {
   return client
      .post("/auth/change-password", { currentPassword, password })
      .then((response) => response.data);
}

function listSessions() {
   return client.get("/auth/sessions").then((response) => response.data);
}

function revokeSession(sessionId) {
   return client
      .delete(`/auth/sessions/${sessionId}`)
      .then((response) => response.data);
}

function logout() {
   return client.post("/auth/logout").then((response) => response.data);
}

function logoutEverywhere() {
   return client.post("/auth/logout-all").then((response) => response.data);
}

export {
   refreshSession,
   getCurrentUser,
   updateProfile,
   register,
   verifyEmail,
   resendVerification,
   forgotPassword,
   resetPassword,
   login,
   changePassword,
   listSessions,
   revokeSession,
   logout,
   logoutEverywhere,
};
