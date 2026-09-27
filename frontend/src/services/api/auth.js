import client, { refreshSession } from "./client";

function getCurrentUser() {
   return client.get("/auth/me").then((response) => response.data);
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

export { refreshSession, getCurrentUser, login, logout, logoutEverywhere };
