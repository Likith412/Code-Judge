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

function login({ email, password }) {
   return client
      .post("/auth/login", { email, password })
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
   register,
   verifyEmail,
   resendVerification,
   login,
   logout,
   logoutEverywhere,
};
